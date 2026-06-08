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
		// 1. Verify links between blocks
		if i == 0 {
			// Genesis block must have "0" or empty as preceding hash
			if block.PrecedingHash != "0" && block.PrecedingHash != "" {
				return false
			}
		} else {
			// Subsequence blocks must securely link to the direct ancestor
			if block.PrecedingHash != blocks[i-1].Hash {
				return false
			}
		}

		// 2. Recompute the local hash signature using exact concatenation
		raw := fmt.Sprintf("%s%s%d", block.Payload, block.PrecedingHash, block.Timestamp)
		calculatedHash := fmt.Sprintf("%x", sha256.Sum256([]byte(raw)))

		if calculatedHash != block.Hash {
			return false
		}
	}

	return true
}
