// dsh-notify-bark — browser half (client plugin bundle).
//
// Loaded by dsh-client-modules at /plugins/dsh-notify-bark/client.js and
// executed through the vendored cordis Loader's lazy-CJS module table
// (window.__ModuleLoader__.load). The factory body is plain CJS with
// require() resolved against the shell's module table — the same shape the
// shipped ui-* packages' tsdown bundles emit. The readable TypeScript source
// lives under src/client/.
//
// This half registers the "Bark 通知" settings section (settings.section
// slot) and talks to the Host exclusively through the /dsh-notify-bark
// loopback RPC: the Bark endpoint is a secret and never crosses the wire —
// the Host answers with a masked status and accepts new values only.
window.__ModuleLoader__.load({
	id: "dsh-notify-bark",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		let _web_react = require("@deepseek-ai/dsh-client-web-react");

		//#region dsh-notify-bark: definitions
		/** The settings section's locale namespace. */
		const NS = "bark-notify";
		/** Logical RPC channel owned by this plugin. */
		const RPC_CHANNEL = "/dsh-notify-bark";
		/** Settings event flags, in display order. */
		const EVENT_KEYS = [
			"completed", "error", "blocked", "aborted",
			"maxTokens", "interrupted", "question", "approval", "planReview",
		];
		//#endregion

		//#region dsh-notify-bark: locales
		/** Simplified Chinese copy. */
		const zh = {
			"nav": "Bark 通知",
			"title": "Bark 通知",
			"intro": "DSH Host 在回合结束、等待回答、等待授权等事件发生时，通过 Bark Server 推送到 iPhone。浏览器关掉也不影响。",
			"loading": "加载中…",
			"loadError": "设置加载失败：{error}",
			"master": "启用 Bark 通知",
			"masterHint": "关闭后不再发送任何推送。",
			"urlLabel": "Bark 推送地址",
			"urlPlaceholder": "https://api.day.app/xxxxxxxx",
			"urlHint": "填写完整推送地址：官方 Bark 或自建 Bark Server 均可。地址不会回显，仅显示脱敏状态。",
			"urlConfigured": "已配置：{masked}",
			"urlUnconfigured": "未配置",
			"urlSave": "保存地址",
			"eventsTitle": "通知事件",
			"contentTitle": "通知内容",
			"includeAssistant": "附带 AI 最后一段回复",
			"includeAssistantHint": "任务完成类通知附带模型最后一段回复。",
			"maxBodyChars": "最大内容长度",
			"groupLabel": "Bark Group",
			"groupHint": "同一 Group 的推送在手机上聚合。",
			"test": "测试推送",
			"testing": "发送中…",
			"testSent": "测试推送已发送",
			"saving": "保存中…",
			"saveFailed": "保存失败：{error}",
			"event.completed": "任务完成",
			"event.error": "执行错误",
			"event.blocked": "执行被阻塞",
			"event.aborted": "手动中止",
			"event.maxTokens": "Token 达到上限",
			"event.interrupted": "异常中断",
			"event.question": "等待我回答",
			"event.approval": "等待授权",
			"event.planReview": "等待计划确认",
		};
		/** English copy. */
		const en = {
			"nav": "Bark notifications",
			"title": "Bark notifications",
			"intro": "The DSH Host pushes to your iPhone through a Bark server when turns end, the agent waits for your answer, or an approval is requested — even with the browser closed.",
			"loading": "Loading…",
			"loadError": "Failed to load settings: {error}",
			"master": "Enable Bark notifications",
			"masterHint": "When off, nothing is pushed.",
			"urlLabel": "Bark push endpoint",
			"urlPlaceholder": "https://api.day.app/xxxxxxxx",
			"urlHint": "Full endpoint URL — official Bark or a self-hosted server. The value is never shown back; only a masked status is.",
			"urlConfigured": "Configured: {masked}",
			"urlUnconfigured": "Not configured",
			"urlSave": "Save endpoint",
			"eventsTitle": "Notification events",
			"contentTitle": "Notification content",
			"includeAssistant": "Include the AI's last reply",
			"includeAssistantHint": "Turn-end notifications append the model's last reply.",
			"maxBodyChars": "Max body length",
			"groupLabel": "Bark group",
			"groupHint": "Pushes sharing a group aggregate on the phone.",
			"test": "Send test push",
			"testing": "Sending…",
			"testSent": "Test push sent",
			"saving": "Saving…",
			"saveFailed": "Failed to save: {error}",
			"event.completed": "Task completed",
			"event.error": "Execution error",
			"event.blocked": "Blocked",
			"event.aborted": "Aborted",
			"event.maxTokens": "Token limit reached",
			"event.interrupted": "Interrupted",
			"event.question": "Waiting for my answer",
			"event.approval": "Waiting for approval",
			"event.planReview": "Plan review",
		};
		//#endregion

		//#region dsh-notify-bark: styles
		const css = ".dshb_section{max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;display:flex}.dshb_heading{margin:0;font-size:18px;font-weight:600}.dshb_intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}.dshb_group{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:12px;flex-direction:column;gap:10px;padding:12px 14px;display:flex}.dshb_groupTitle{margin:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary)}.dshb_row{align-items:center;gap:10px;display:flex}.dshb_rowWide{align-items:center;gap:10px;flex-wrap:wrap;display:flex}.dshb_check{color:var(--dsw-alias-label-primary);align-items:center;gap:8px;cursor:pointer;font-size:13px;line-height:20px;display:inline-flex}.dshb_check input{accent-color:var(--dsw-alias-state-business-primary);flex:none}.dshb_checkLabel{min-width:0}.dshb_input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);height:32px;min-width:0;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;flex:1;padding:0 10px;font-size:13px}.dshb_input:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}.dshb_input::placeholder{color:var(--dsw-alias-label-tertiary)}.dshb_num{max-width:110px}.dshb_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}.dshb_mask{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}.dshb_button{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;border-radius:8px;flex:none;padding:5px 12px;font-size:13px}.dshb_button:hover:not(:disabled){border-color:var(--dsw-alias-label-dimmed)}.dshb_button:disabled{opacity:.5;cursor:default}.dshb_status{margin:0;font-size:12px;line-height:18px}.dshb_statusOk{color:var(--dsw-alias-state-success-primary)}.dshb_statusError{color:var(--dsw-alias-state-error-primary)}.dshb_label{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;flex:none}";
		const tagId = "dsh-notify-bark/BarkSettings.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-notify-bark";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		const styles = {
			"section": "dshb_section", "heading": "dshb_heading", "intro": "dshb_intro",
			"group": "dshb_group", "groupTitle": "dshb_groupTitle", "row": "dshb_row",
			"rowWide": "dshb_rowWide", "check": "dshb_check", "checkLabel": "dshb_checkLabel",
			"input": "dshb_input", "num": "dshb_num", "hint": "dshb_hint", "mask": "dshb_mask",
			"button": "dshb_button", "status": "dshb_status", "statusOk": "dshb_statusOk",
			"statusError": "dshb_statusError", "label": "dshb_label",
		};
		//#endregion

		//#region dsh-notify-bark: section controller
		/**
		 * Host transport for the section: reads the masked status, writes new
		 * settings, and fires test pushes through the /dsh-notify-bark RPC,
		 * publishing a snapshot store the component reads via a selector hook.
		 */
		var BarkSectionController = class {
			constructor(connection) {
				this.connection = connection;
				this.store = (0, _runtime_client.createSnapshotStore)({
					status: "loading",
					settings: null,
					urlConfigured: false,
					urlMasked: "",
					saveError: null,
					saving: false,
					testing: false,
					testResult: null,
				});
				this.load();
			}
			async load() {
				try {
					const result = await this.connection.rpc.call(RPC_CHANNEL, "get", {});
					if (!result.ok) throw new Error(result.error.message);
					this.store.update((draft) => {
						draft.status = "ready";
						draft.settings = result.value.settings;
						draft.urlConfigured = result.value.status.configured;
						draft.urlMasked = result.value.status.masked;
						draft.saveError = null;
					});
				} catch (error) {
					this.store.update((draft) => {
						draft.status = "error";
						draft.saveError = error instanceof Error ? error.message : String(error);
					});
				}
			}
			async save(patch) {
				this.store.update((draft) => { draft.saving = true; draft.saveError = null; });
				try {
					const result = await this.connection.rpc.call(RPC_CHANNEL, "set", { patch });
					if (!result.ok) throw new Error(result.error.message);
					await this.load();
				} catch (error) {
					this.store.update((draft) => {
						draft.saveError = error instanceof Error ? error.message : String(error);
					});
				} finally {
					this.store.update((draft) => { draft.saving = false; });
				}
			}
			async test(group) {
				this.store.update((draft) => { draft.testing = true; draft.testResult = null; });
				try {
					const result = await this.connection.rpc.call(RPC_CHANNEL, "test", { group });
					if (!result.ok) throw new Error(result.error.message);
					this.store.update((draft) => {
						draft.testResult = { ok: true, message: "sent" };
					});
				} catch (error) {
					this.store.update((draft) => {
						draft.testResult = { ok: false, message: error instanceof Error ? error.message : String(error) };
					});
				} finally {
					this.store.update((draft) => { draft.testing = false; });
				}
			}
		};
		//#endregion

		//#region dsh-notify-bark: settings section
		/**
		 * Render the Bark notifications section: master switch, write-only
		 * endpoint field with a masked status, event checkboxes, content
		 * options, and the test-push button.
		 */
		function BarkSettingsSection(props) {
			const { t, controller, useBark } = props;
			const snap = useBark((s) => s);
			const [urlDraft, setUrlDraft] = react.useState("");
			const [groupDraft, setGroupDraft] = react.useState("");
			const [bodyCharsDraft, setBodyCharsDraft] = react.useState("");

			if (snap.status === "loading") {
				return react_jsx_runtime.jsx("p", { className: styles.hint, children: t("loading") });
			}
			if (snap.status === "error") {
				return react_jsx_runtime.jsx("p", {
					className: styles.statusError,
					role: "alert",
					children: t("loadError", { error: snap.saveError ?? "?" }),
				});
			}

			const settings = snap.settings;
			const urlPlaceholder = snap.urlConfigured ? t("urlConfigured", { masked: snap.urlMasked }) : t("urlUnconfigured");
			const events = settings.events;

			const toggleEvent = (key) => {
				const next = { ...events, [key]: !events[key] };
				controller.store.update((draft) => { draft.settings = { ...draft.settings, events: next }; });
				void controller.save({ events: next });
			};

			const saveUrl = () => {
				const value = urlDraft.trim();
				if (value.length === 0) return;
				setUrlDraft("");
				void controller.save({ barkUrl: value });
			};

			const saveGroup = () => {
				const value = groupDraft.trim();
				if (value.length === 0) return;
				setGroupDraft("");
				void controller.save({ group: value });
			};

			const saveBodyChars = () => {
				const parsed = Number(bodyCharsDraft);
				if (!Number.isFinite(parsed)) { setBodyCharsDraft(""); return; }
				const clamped = Math.min(4000, Math.max(1, Math.round(parsed)));
				setBodyCharsDraft("");
				void controller.save({ maxBodyChars: clamped });
			};

			const onTest = () => {
				const group = groupDraft.trim().length > 0 ? groupDraft : settings.group;
				void controller.test(group);
			};

			return react_jsx_runtime.jsxs("div", {
				className: styles.section,
				children: [
					react_jsx_runtime.jsx("h2", { className: styles.heading, children: t("title") }),
					react_jsx_runtime.jsx("p", { className: styles.intro, children: t("intro") }),

					react_jsx_runtime.jsxs("div", {
						className: styles.group,
						children: [
							react_jsx_runtime.jsxs("label", {
								className: styles.check,
								children: [
									react_jsx_runtime.jsx("input", {
										type: "checkbox",
										checked: settings.enabled,
										onChange: (e) => {
											const next = e.target.checked;
											controller.store.update((draft) => { draft.settings = { ...draft.settings, enabled: next }; });
											void controller.save({ enabled: next });
										},
									}),
									react_jsx_runtime.jsx("span", { className: styles.checkLabel, children: t("master") }),
								],
							}),
							react_jsx_runtime.jsx("p", { className: styles.hint, children: t("masterHint") }),
						],
					}),

					react_jsx_runtime.jsxs("div", {
						className: styles.group,
						children: [
							react_jsx_runtime.jsx("p", { className: styles.groupTitle, children: t("urlLabel") }),
							react_jsx_runtime.jsxs("div", {
								className: styles.rowWide,
								children: [
									react_jsx_runtime.jsx("input", {
										className: styles.input,
										type: "text",
										placeholder: urlPlaceholder,
										value: urlDraft,
										onChange: (e) => setUrlDraft(e.target.value),
										onBlur: saveUrl,
										onKeyDown: (e) => { if (e.key === "Enter") saveUrl(); },
									}),
									react_jsx_runtime.jsx("button", {
										type: "button",
										className: styles.button,
										disabled: urlDraft.trim().length === 0 || snap.saving,
										onClick: saveUrl,
										children: t("urlSave"),
									}),
									react_jsx_runtime.jsx("button", {
										type: "button",
										className: styles.button,
										disabled: snap.testing || snap.saving,
										onClick: onTest,
										children: snap.testing ? t("testing") : t("test"),
									}),
								],
							}),
							react_jsx_runtime.jsx("p", { className: styles.hint, children: t("urlHint") }),
							snap.testResult !== null
								? react_jsx_runtime.jsx("p", {
										className: snap.testResult.ok ? styles.statusOk : styles.statusError,
										role: "status",
										children: snap.testResult.ok ? t("testSent") : snap.testResult.message,
									})
								: null,
							snap.saveError !== null
								? react_jsx_runtime.jsx("p", {
										className: styles.statusError,
										role: "alert",
										children: t("saveFailed", { error: snap.saveError }),
									})
								: null,
						],
					}),

					react_jsx_runtime.jsxs("div", {
						className: styles.group,
						children: [
							react_jsx_runtime.jsx("p", { className: styles.groupTitle, children: t("eventsTitle") }),
							...EVENT_KEYS.map((key) => react_jsx_runtime.jsx("label", {
								className: styles.check,
								children: [
									react_jsx_runtime.jsx("input", {
										type: "checkbox",
										checked: events[key],
										onChange: () => toggleEvent(key),
									}),
									react_jsx_runtime.jsx("span", { className: styles.checkLabel, children: t("event." + key) }),
								],
							}, key)),
						],
					}),

					react_jsx_runtime.jsxs("div", {
						className: styles.group,
						children: [
							react_jsx_runtime.jsx("p", { className: styles.groupTitle, children: t("contentTitle") }),
							react_jsx_runtime.jsxs("label", {
								className: styles.check,
								children: [
									react_jsx_runtime.jsx("input", {
										type: "checkbox",
										checked: settings.includeAssistantText,
										onChange: (e) => {
											const next = e.target.checked;
											controller.store.update((draft) => { draft.settings = { ...draft.settings, includeAssistantText: next }; });
											void controller.save({ includeAssistantText: next });
										},
									}),
									react_jsx_runtime.jsx("span", { className: styles.checkLabel, children: t("includeAssistant") }),
								],
							}),
							react_jsx_runtime.jsx("p", { className: styles.hint, children: t("includeAssistantHint") }),
							react_jsx_runtime.jsxs("div", {
								className: styles.row,
								children: [
									react_jsx_runtime.jsx("span", { className: styles.label, children: t("maxBodyChars") }),
									react_jsx_runtime.jsx("input", {
										className: styles.input + " " + styles.num,
										type: "number",
										min: 1,
										max: 4000,
										value: bodyCharsDraft.length > 0 ? bodyCharsDraft : settings.maxBodyChars,
										onChange: (e) => setBodyCharsDraft(e.target.value),
										onBlur: saveBodyChars,
										onKeyDown: (e) => { if (e.key === "Enter") saveBodyChars(); },
									}),
								],
							}),
							react_jsx_runtime.jsxs("div", {
								className: styles.row,
								children: [
									react_jsx_runtime.jsx("span", { className: styles.label, children: t("groupLabel") }),
									react_jsx_runtime.jsx("input", {
										className: styles.input,
										type: "text",
										value: groupDraft.length > 0 ? groupDraft : settings.group,
										onChange: (e) => setGroupDraft(e.target.value),
										onBlur: saveGroup,
										onKeyDown: (e) => { if (e.key === "Enter") saveGroup(); },
									}),
								],
							}),
							react_jsx_runtime.jsx("p", { className: styles.hint, children: t("groupHint") }),
						],
					}),
				],
			});
		}
		//#endregion

		//#region dsh-notify-bark: plugin entry
		/** Required services (cordis fiber inject). */
		const inject = ["slots", "locale", "connection"];

		/**
		 * Register the Bark dictionaries and the settings section.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-notify-bark: dictionaries");

			ctx.inject(["slots", "locale", "connection"], (scope) => {
				const connection = scope.get("connection");
				const controller = new BarkSectionController(connection);
				const useBark = (0, _web_react.bindSnapshotSelector)(controller.store);
				const t = scope.locale.bind(NS);

				scope.slots.inject("settings.section", () => scope.slots.register({
					name: "settings.section",
					id: "bark-notify",
					order: 40,
					label: () => t("nav"),
					locale: NS,
					inject: () => ({ controller, useBark }),
				}, BarkSettingsSection));
			});
		}
		//#endregion

		exports.BarkSectionController = BarkSectionController;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
