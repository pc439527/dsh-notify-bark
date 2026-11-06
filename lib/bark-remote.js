/**
 * dsh-notify-bark Host Remote service — the barkNotify namespace.
 *
 * The service rides DSH's Typert Remote path: `TypertRemoteService` publishes
 * the binding, the Gateway discovers the `@Remote` methods (SRC mode derives
 * the descriptor from the live method signatures), and every browser call
 * crosses the authenticated shared /api channel the same way the official
 * surfaces do. The service stays business-only: validation, masked reads, and
 * Host-side persistence.
 * @module dsh-notify-bark/bark-remote
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { buildTestPayload, sendBark } from "./bark-service.js";
import { maskBarkUrl, sanitizeBarkUrl } from "./settings-store.js";
import { BARK_REMOTE_NAMESPACE, validateSetPatch, } from "./remote-contract.js";
/**
 * The barkNotify Remote service: get / set / test over the shared /api channel.
 * get answers with the masked status and never echoes the endpoint; set
 * accepts new values only; test sends one push from the configured endpoint.
 */
let BarkSettingsRemote = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _get_decorators;
    let _set_decorators;
    let _test_decorators;
    return class BarkSettingsRemote extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _get_decorators = [Remote];
            _set_decorators = [Remote];
            _test_decorators = [Remote];
            __esDecorate(this, null, _get_decorators, { kind: "method", name: "get", static: false, private: false, access: { has: obj => "get" in obj, get: obj => obj.get }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _set_decorators, { kind: "method", name: "set", static: false, private: false, access: { has: obj => "set" in obj, get: obj => obj.set }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _test_decorators, { kind: "method", name: "test", static: false, private: false, access: { has: obj => "test" in obj, get: obj => obj.test }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        deps = __runInitializers(this, _instanceExtraInitializers);
        constructor(ctx, deps) {
            super(ctx, BARK_REMOTE_NAMESPACE);
            this.deps = deps;
        }
        async get() {
            const settings = this.deps.getSettings();
            const { configured, masked } = maskBarkUrl(settings.barkUrl);
            return {
                settings: {
                    enabled: settings.enabled,
                    events: settings.events,
                    includeAssistantText: settings.includeAssistantText,
                    maxBodyChars: settings.maxBodyChars,
                    group: settings.group,
                },
                status: { enabled: settings.enabled, configured, masked },
            };
        }
        async set(patch) {
            const verdict = validateSetPatch(patch);
            if (verdict.message !== undefined || verdict.patch === undefined) {
                throw new RemoteError('gateway/bad-request', verdict.message ?? 'set: patch must be an object', {});
            }
            await this.deps.update(verdict.patch);
            return { saved: true };
        }
        async test(group) {
            const settings = this.deps.getSettings();
            const endpoint = sanitizeBarkUrl(settings.barkUrl);
            if (endpoint.length === 0) {
                throw new RemoteError('gateway/bad-request', '未配置有效的 Bark 推送地址（请只填写基础地址，不要粘贴 curl 命令），请先修正并保存', {});
            }
            const resolved = typeof group === 'string' && group.trim().length > 0 ? group.trim() : settings.group;
            await sendBark(endpoint, buildTestPayload(resolved));
            return { sent: true };
        }
    };
})();
export { BarkSettingsRemote };
/**
 * Publish the Remote service for the plugin's fiber.
 * @param ctx - plugin context.
 * @param deps - settings read/write access.
 */
export function registerBarkRemote(ctx, deps) {
    new BarkSettingsRemote(ctx, deps);
}
//# sourceMappingURL=bark-remote.js.map