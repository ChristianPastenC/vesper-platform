package usecase

import (
	"crypto/sha256"
	"fmt"

	"sovereign-core/backend-api/internal/domain"
)

// ValidateLedgerChain iterates over a series of transaction blocks and recalculates
// their cryptographic signatures to ensure immutability and prevent memory scraping/injection.
// The mathematical proof is: H_n = SHA256(Payload_actual + Preceding_Hash + Timestamp)
func ValidateLedgerChain(blocks []domain.TransactionBlock) bool {
	if len(blocks) == 0 {
		// A transaction without a ledger is suspicious and considered forged.
		return false
	}

	for i, block := range blocks {
		// 1. Verify cryptographic links between subsequent blocks
		if i == 0 {
			// Genesis block must contain "0" or an empty string as preceding hash
			if block.PrecedingHash != "0" && block.PrecedingHash != "" {
				return false
			}
		} else {
			// Subsequent blocks must securely link to their direct ancestor
			if block.PrecedingHash != blocks[i-1].Hash {
				return false
			}
		}

		// 2. Recompute the local hash signature using exact string concatenation
		raw := fmt.Sprintf("%s%s%d", block.Payload, block.PrecedingHash, block.Timestamp)
		calculatedHash := fmt.Sprintf("%x", sha256.Sum256([]byte(raw)))

		// 3. Hash mismatch signals tampered or forged block — abort chain validation
		if calculatedHash != block.Hash {
			return false
		}
	}

	return true
}
