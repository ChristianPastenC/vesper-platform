package client

import (
	"errors"
	"net/http"
	"sync"
	"time"
)

// CircuitState represents the state of the circuit breaker.
type CircuitState int

const (
	StateClosed CircuitState = iota
	StateOpen
	StateHalfOpen
)

// ErrCircuitBreakerOpen is returned when the circuit breaker rejects a request.
var ErrCircuitBreakerOpen = errors.New("circuit breaker is open")

// ResilientRoundTripper decorates an http.RoundTripper with retries and a circuit breaker.
type ResilientRoundTripper struct {
	next        http.RoundTripper
	maxRetries  int
	baseBackoff time.Duration
	multiplier  int

	mu                  sync.RWMutex
	state               CircuitState
	consecutiveFailures int
	failureThreshold    int
	openTimeout         time.Duration
	openedAt            time.Time
}

// NewResilientRoundTripper creates a new ResilientRoundTripper wrapping the provided transport.
func NewResilientRoundTripper(next http.RoundTripper) *ResilientRoundTripper {
	if next == nil {
		next = http.DefaultTransport
	}
	return &ResilientRoundTripper{
		next:             next,
		maxRetries:       3,
		baseBackoff:      500 * time.Millisecond,
		multiplier:       2,
		state:            StateClosed,
		failureThreshold: 5,
		openTimeout:      30 * time.Second,
	}
}

// RoundTrip executes a single HTTP transaction, applying resilient policies.
func (rt *ResilientRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if !rt.allowRequest() {
		return nil, ErrCircuitBreakerOpen
	}

	var resp *http.Response
	var err error
	backoff := rt.baseBackoff

	for attempt := 0; attempt <= rt.maxRetries; attempt++ {
		// Wait before retrying (exponential backoff)
		if attempt > 0 {
			time.Sleep(backoff)
			backoff *= time.Duration(rt.multiplier)

			// Rewind body if present
			if req.GetBody != nil {
				newBody, getErr := req.GetBody()
				if getErr != nil {
					rt.recordFailure()
					return resp, getErr
				}
				req.Body = newBody
			}
		}

		resp, err = rt.next.RoundTrip(req)

		isFailure := false
		if err != nil {
			isFailure = true
		} else if resp.StatusCode >= 500 && resp.StatusCode < 600 {
			isFailure = true
		}

		if !isFailure {
			rt.recordSuccess()
			return resp, nil
		}

		// Clean up the body of the failed response before retrying to prevent connection leaks
		if resp != nil && attempt < rt.maxRetries {
			resp.Body.Close()
		}
	}

	rt.recordFailure()
	return resp, err
}

func (rt *ResilientRoundTripper) allowRequest() bool {
	rt.mu.RLock()
	state := rt.state
	openedAt := rt.openedAt
	rt.mu.RUnlock()

	if state == StateClosed {
		return true
	}

	if state == StateOpen {
		if time.Since(openedAt) >= rt.openTimeout {
			// Transition to Half-Open to test the waters
			rt.mu.Lock()
			if rt.state == StateOpen {
				rt.state = StateHalfOpen
			}
			rt.mu.Unlock()
			return true
		}
		return false
	}

	// StateHalfOpen: allow requests to test if the service has recovered
	return true
}

func (rt *ResilientRoundTripper) recordSuccess() {
	rt.mu.Lock()
	defer rt.mu.Unlock()

	rt.consecutiveFailures = 0
	if rt.state != StateClosed {
		rt.state = StateClosed
	}
}

func (rt *ResilientRoundTripper) recordFailure() {
	rt.mu.Lock()
	defer rt.mu.Unlock()

	rt.consecutiveFailures++

	if rt.state == StateClosed {
		if rt.consecutiveFailures >= rt.failureThreshold {
			rt.state = StateOpen
			rt.openedAt = time.Now()
		}
	} else if rt.state == StateHalfOpen {
		rt.state = StateOpen
		rt.openedAt = time.Now()
	}
}
