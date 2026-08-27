#include "SovereignLedger.h"
#include "CryptoUtils.h"
#include <algorithm>

namespace sovereign::secure {

TransactionBlock SovereignLedger::enqueue(
    const std::string& id,
    const std::vector<uint8_t>& serializedRequest,
    uint64_t timestamp,
    double ttl
) {
    std::vector<uint8_t> prevHash = resolvePreviousHash();
    std::vector<uint8_t> currentHash = computeBlockHash(serializedRequest, prevHash, timestamp);

    TransactionBlock block{id, serializedRequest, timestamp, ttl, prevHash, currentHash, false};
    queue_.push_back(block);
    id_to_index_[id] = queue_.size() - 1;
    
    return block;
}

bool SovereignLedger::dequeueAndZeroize(const std::string& id) {
    auto it = id_to_index_.find(id);
    if (it == id_to_index_.end()) {
        return false;
    }

    zeroizeBlock(queue_[it->second]);
    queue_.erase(queue_.begin() + it->second);
    rechainLedger();
    return true;
}

void SovereignLedger::clearAll() {
    for (auto& block : queue_) {
        zeroizeBlock(block);
    }
    queue_.clear();
    id_to_index_.clear();
}

bool SovereignLedger::verifyIntegrity() const {
    std::vector<uint8_t> expectedPrevHash(32, 0);

    for (const auto& block : queue_) {
        if (!crypto::constantTimeEqual(block.previousHash, expectedPrevHash)) {
            return false;
        }
        if (!block.isZeroized) {
            std::vector<uint8_t> recomputed = computeBlockHash(block.serializedRequest, block.previousHash, block.timestamp);
            if (!crypto::constantTimeEqual(block.currentHash, recomputed)) {
                return false;
            }
        }
        expectedPrevHash = block.currentHash;
    }
    return true;
}

std::vector<std::string> SovereignLedger::getIds() const {
    std::vector<std::string> ids;
    ids.reserve(queue_.size());
    for (const auto& block : queue_) {
        ids.push_back(block.id);
    }
    return ids;
}

const TransactionBlock* SovereignLedger::getBlock(const std::string& id) const {
    auto it = id_to_index_.find(id);
    if (it != id_to_index_.end()) {
        return &queue_[it->second];
    }
    return nullptr;
}

void SovereignLedger::zeroizeBlock(TransactionBlock& block) {
    // Use secure_zero (volatile-pointer idiom) to prevent the compiler from
    // eliding these writes as "dead stores" when the buffer goes out of scope.
    // std::fill is NOT safe here because the optimizer legally treats writes
    // to a soon-to-be-destroyed buffer as dead writes at -O2/-O3.
    if (!block.serializedRequest.empty()) {
        crypto::secure_zero(block.serializedRequest.data(), block.serializedRequest.size());
    }
    if (!block.previousHash.empty()) {
        crypto::secure_zero(block.previousHash.data(), block.previousHash.size());
    }
    if (!block.currentHash.empty()) {
        crypto::secure_zero(block.currentHash.data(), block.currentHash.size());
    }
    block.isZeroized = true;
}

std::vector<uint8_t> SovereignLedger::computeBlockHash(
    const std::vector<uint8_t>& serializedRequest,
    const std::vector<uint8_t>& previousHash,
    uint64_t timestamp
) const {
    std::vector<uint8_t> preImage;
    preImage.reserve(serializedRequest.size() + previousHash.size() + 32);
    preImage.insert(preImage.end(), serializedRequest.begin(), serializedRequest.end());
    preImage.insert(preImage.end(), previousHash.begin(), previousHash.end());
    std::string ts_str = std::to_string(timestamp);
    preImage.insert(preImage.end(), ts_str.begin(), ts_str.end());
    return crypto::sha256(preImage);
}

std::vector<uint8_t> SovereignLedger::resolvePreviousHash() const {
    if (queue_.empty()) return std::vector<uint8_t>(32, 0);
    return queue_.back().currentHash;
}

void SovereignLedger::rechainLedger() {
    // DESIGN CONTRACT — por qué recadena es correcto y necesario:
    //
    // Esta es una COLA DE TRANSACCIONES PENDIENTES (offline queue). Los bloques
    // aquí almacenados NO han sido transmitidos al backend todavía — se encolan
    // cuando el dispositivo está offline y se procesan (desencolan) al reconectar.
    //
    // Los hashes de bloque son artefactos de integridad INTERNOS. No se exponen
    // como pruebas criptográficas externas — el backend recibe el payload de la
    // transacción, no el hash del bloque en la cadena local.
    //
    // Al eliminar un bloque físicamente (queue_.erase), la cadena queda con un
    // "hueco" posicional. El bloque siguiente tiene previousHash apuntando al
    // hash del bloque eliminado, que ya no existe. verifyIntegrity() fallaría
    // al comparar contra su expectedPrevHash acumulado desde el génesis.
    //
    // Solución correcta: recadena los bloques restantes (aún PENDIENTES) desde
    // el génesis para restaurar la consistencia de la cadena. Sus nuevos hashes
    // serán los definitivos cuando se transmitan al backend.
    //
    // El payload de datos sensibles ya fue purgado con secure_zero() ANTES del
    // erase — el rechaineado opera sobre los payloads de bloques vivos únicamente.

    std::vector<uint8_t> runningPrevHash(32, 0);
    id_to_index_.clear();
    for (size_t i = 0; i < queue_.size(); ++i) {
        queue_[i].previousHash = runningPrevHash;
        if (!queue_[i].isZeroized) {
            queue_[i].currentHash = computeBlockHash(
                queue_[i].serializedRequest,
                queue_[i].previousHash,
                queue_[i].timestamp
            );
        }
        runningPrevHash = queue_[i].currentHash;
        id_to_index_[queue_[i].id] = i;
    }
}

} // namespace sovereign::secure
