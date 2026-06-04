package challenge_test

import (
	"testing"
	"time"

	"sovereign-core/backend-api/internal/challenge"
)

func TestIssueAndVerify(t *testing.T) {
	secret := []byte("test-secret-sovereign-core-32bytes!")
	iss := challenge.NewIssuer(secret, 5*time.Minute)

	tok, err := iss.Issue()
	if err != nil {
		t.Fatalf("Issue() error: %v", err)
	}

	if len(tok.Nonce) != 64 {
		t.Errorf("expected 64-char hex nonce, got %d chars", len(tok.Nonce))
	}
	if tok.ChallengeID != tok.Nonce[:16] {
		t.Errorf("ChallengeID mismatch: %q vs nonce prefix %q", tok.ChallengeID, tok.Nonce[:16])
	}
	if tok.ExpiresAt <= tok.IssuedAt {
		t.Errorf("ExpiresAt (%d) must be after IssuedAt (%d)", tok.ExpiresAt, tok.IssuedAt)
	}

	if err := iss.Verify(tok); err != nil {
		t.Errorf("Verify() on fresh token should succeed, got: %v", err)
	}
}

func TestVerifyExpired(t *testing.T) {
	secret := []byte("test-secret-sovereign-core-32bytes!")
	// ExpiresAt is stored as Unix seconds, so the minimum observable TTL is 1 second.
	iss := challenge.NewIssuer(secret, 1*time.Second)

	tok, err := iss.Issue()
	if err != nil {
		t.Fatalf("Issue() error: %v", err)
	}

	// Wait until the expiry second has definitively passed.
	time.Sleep(1500 * time.Millisecond)

	err = iss.Verify(tok)
	if err != challenge.ErrExpired {
		t.Errorf("expected ErrExpired, got: %v", err)
	}
}

func TestVerifyTamperedSignature(t *testing.T) {
	secret := []byte("test-secret-sovereign-core-32bytes!")
	iss := challenge.NewIssuer(secret, 5*time.Minute)

	tok, _ := iss.Issue()
	tok.Signature = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"

	err := iss.Verify(tok)
	if err != challenge.ErrInvalidSignature {
		t.Errorf("expected ErrInvalidSignature, got: %v", err)
	}
}

func TestEncodeAndParse(t *testing.T) {
	secret := []byte("test-secret-sovereign-core-32bytes!")
	iss := challenge.NewIssuer(secret, 5*time.Minute)

	tok, _ := iss.Issue()
	encoded := tok.Encode()

	parsed, err := iss.Parse(encoded)
	if err != nil {
		t.Fatalf("Parse() error: %v", err)
	}

	if parsed.Nonce != tok.Nonce {
		t.Errorf("Nonce mismatch after round-trip: %q vs %q", parsed.Nonce, tok.Nonce)
	}
	if parsed.ExpiresAt != tok.ExpiresAt {
		t.Errorf("ExpiresAt mismatch after round-trip: %d vs %d", parsed.ExpiresAt, tok.ExpiresAt)
	}
	if parsed.Signature != tok.Signature {
		t.Errorf("Signature mismatch after round-trip")
	}

	// Parsed token must still verify.
	if err := iss.Verify(parsed); err != nil {
		t.Errorf("Verify() on round-tripped token failed: %v", err)
	}
}

func TestParseMalformed(t *testing.T) {
	iss := challenge.NewIssuer([]byte("any"), 5*time.Minute)

	cases := []string{"", "abc", "a.b.c", "a..c.d"}
	for _, c := range cases {
		_, err := iss.Parse(c)
		if err != challenge.ErrMalformed {
			t.Errorf("Parse(%q): expected ErrMalformed, got %v", c, err)
		}
	}
}

func TestRemainingTTL(t *testing.T) {
	secret := []byte("test-secret-sovereign-core-32bytes!")
	iss := challenge.NewIssuer(secret, 5*time.Minute)

	tok, _ := iss.Issue()
	remaining := tok.RemainingTTL()

	if remaining <= 0 || remaining > 5*time.Minute {
		t.Errorf("unexpected RemainingTTL: %v", remaining)
	}
}
