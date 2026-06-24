#include "SovereignSecureClient.h"
#include "CryptoUtils.h"

namespace sovereign::secure {

SovereignSecureClient::SovereignSecureClient()
    : HybridSovereignSecureClientSpec() {}

jsi::Value SovereignSecureClient::get(jsi::Runtime& rt, const jsi::PropNameID& name) {
    auto propName = name.utf8(rt);

    if (propName == "verifyIntegrity") {
        return jsi::Function::createFromHostFunction(rt, name, 0,
            [this](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
                return jsi::Value(this->verifyIntegrity());
            });
    }

    if (propName == "toggleNetworkSim") {
        return jsi::Function::createFromHostFunction(rt, name, 1,
            [this](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
                if (count > 0 && args[0].isBool()) {
                    this->toggleNetworkSim(args[0].getBool());
                }
                return jsi::Value::undefined();
            });
    }

    if (propName == "clearQueue") {
        return jsi::Function::createFromHostFunction(rt, name, 0,
            [this](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
                this->clearQueue();
                return jsi::Value::undefined();
            });
    }

    if (propName == "executeTransaction") {
        return jsi::Function::createFromHostFunction(rt, name, 3,
            [this](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
                if (count > 2 && args[0].isString() && args[1].isObject() && args[2].isNumber()) {
                    std::string id = args[0].getString(runtime).utf8(runtime);
                    jsi::Object obj = args[1].getObject(runtime);
                    if (obj.isArrayBuffer(runtime)) {
                        jsi::ArrayBuffer jsiBuffer = obj.getArrayBuffer(runtime);
                        auto buffer = ArrayBuffer::copy(jsiBuffer.data(runtime), jsiBuffer.size(runtime));
                        double ttl = args[2].getNumber();
                        bool result = this->executeTransaction(id, buffer, ttl);
                        return jsi::Value(result);
                    }
                }
                return jsi::Value(false);
            });
    }

    if (propName == "getQueueStatus") {
        return jsi::Function::createFromHostFunction(rt, name, 0,
            [this](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
                auto status = this->getQueueStatus();
                jsi::Object obj(runtime);
                obj.setProperty(runtime, "size", status.size);
                obj.setProperty(runtime, "isLocked", status.isLocked);
                obj.setProperty(runtime, "isIntegrityCompromised", status.isIntegrityCompromised);
                return obj;
            });
    }

    if (propName == "dequeueTransaction") {
        return jsi::Function::createFromHostFunction(rt, name, 1,
            [this](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
                if (count > 0 && args[0].isString()) {
                    std::string id = args[0].getString(runtime).utf8(runtime);
                    this->dequeueTransaction(id);
                }
                return jsi::Value::undefined();
            });
    }

    if (propName == "zeroize") {
        return jsi::Function::createFromHostFunction(rt, name, 1,
            [this](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
                if (count > 0 && args[0].isString()) {
                    std::string id = args[0].getString(runtime).utf8(runtime);
                    this->zeroize(id);
                }
                return jsi::Value::undefined();
            });
    }

    if (propName == "getQueueIds") {
        return jsi::Function::createFromHostFunction(rt, name, 0,
            [this](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
                auto ids = this->getQueueIds();
                jsi::Array result(runtime, ids.size());
                for (size_t i = 0; i < ids.size(); ++i) {
                    result.setValueAtIndex(runtime, i, jsi::String::createFromUtf8(runtime, ids[i]));
                }
                return result;
            });
    }

    if (propName == "getTransactionPayload") {
        return jsi::Function::createFromHostFunction(rt, name, 1,
            [this](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
                if (count > 0 && args[0].isString()) {
                    std::string id = args[0].getString(runtime).utf8(runtime);
                    auto payload = this->getTransactionPayload(id);
                    if (payload != nullptr) {
                        jsi::Function arrayBufferCtor = runtime.global().getPropertyAsFunction(runtime, "ArrayBuffer");
                        jsi::Object jsiBufferObj = arrayBufferCtor.callAsConstructor(runtime, static_cast<double>(payload->size())).getObject(runtime);
                        jsi::ArrayBuffer buf = jsiBufferObj.getArrayBuffer(runtime);
                        std::memcpy(buf.data(runtime), payload->data(), payload->size());
                        return jsiBufferObj;
                    }
                }
                return jsi::Value::undefined();
            });
    }

    if (propName == "base64UrlEncode") {
        return jsi::Function::createFromHostFunction(rt, name, 1,
            [this](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
                if (count > 0 && args[0].isObject()) {
                    jsi::Object obj = args[0].getObject(runtime);
                    if (obj.isArrayBuffer(runtime)) {
                        jsi::ArrayBuffer jsiBuffer = obj.getArrayBuffer(runtime);
                        size_t size = jsiBuffer.size(runtime);
                        uint8_t* data = jsiBuffer.data(runtime);
                        std::vector<uint8_t> vec(data, data + size);
                        std::string encoded = crypto::base64UrlEncode(vec);
                        return jsi::String::createFromUtf8(runtime, encoded);
                    }
                }
                return jsi::Value::undefined();
            });
    }

    return jsi::Value::undefined();
}

bool SovereignSecureClient::executeTransaction(
    const std::string& id,
    const std::shared_ptr<ArrayBuffer>& serializedRequest,
    double ttl
) {
    const uint8_t* data_ptr = serializedRequest->data();
    size_t data_size = serializedRequest->size();
    std::vector<uint8_t> payload(data_ptr, data_ptr + data_size);

    return core_.executeTransaction(id, payload, ttl);
}

QueueStatus SovereignSecureClient::getQueueStatus() {
    CoreQueueStatus status = core_.getQueueStatus();
    return QueueStatus{
        static_cast<double>(status.size),
        status.isLocked,
        status.isIntegrityCompromised
    };
}

void SovereignSecureClient::toggleNetworkSim(bool online) {
    core_.toggleNetworkSim(online);
}

void SovereignSecureClient::dequeueTransaction(const std::string& id) {
    core_.dequeueTransaction(id);
}

bool SovereignSecureClient::verifyIntegrity() {
    return core_.verifyIntegrity();
}

void SovereignSecureClient::clearQueue() {
    core_.clearQueue();
}

void SovereignSecureClient::zeroize(const std::string& id) {
    core_.zeroize(id);
}

std::vector<std::string> SovereignSecureClient::getQueueIds() {
    return core_.getQueueIds();
}

std::shared_ptr<ArrayBuffer> SovereignSecureClient::getTransactionPayload(const std::string& id) {
    std::vector<uint8_t> payload = core_.getTransactionPayload(id);
    if (payload.empty()) {
        return nullptr;
    }
    return ArrayBuffer::copy(payload.data(), payload.size());
}

} // namespace sovereign::secure