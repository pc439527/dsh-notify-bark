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
// slot) and talks to the Host through the barkNotify Typert Remote namespace
// on the shared /api channel: the Bark URL only travels browser → Host on a
// set call; reads answer with a masked status and never echo the value.
window.__ModuleLoader__.load({
	id: "dsh-notify-bark",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _runtime_client = require("@deepseek-ai/dsh-client-store");

		//#region dsh-notify-bark: definitions
		/** The settings section's locale namespace. */
		const NS = "bark-notify";
		/** Allowed notification body length bounds. */
		const MIN_BODY_CHARS = 1;
		const MAX_BODY_CHARS = 4000;
		const FULLWIDTH_DIGITS = /[\uFF10-\uFF19]/g;
		/**
		 * Parse a user-entered draft string for `maxBodyChars`.
		 * Returns `null` for empty/invalid drafts so the field reverts instead of overwriting.
		 */
		function parseBodyCharsDraft(raw) {
			const normalized = raw.replace(FULLWIDTH_DIGITS, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).trim();
			if (normalized.length === 0) return null;
			const parsed = Number(normalized);
			if (!Number.isFinite(parsed)) return null;
			return Math.min(MAX_BODY_CHARS, Math.max(MIN_BODY_CHARS, Math.round(parsed)));
		}
		/** Settings event flags, in display order. */
		const EVENT_KEYS = [
			"completed", "error", "blocked", "aborted",
			"maxTokens", "interrupted", "question", "approval", "planReview",
		];
		//#endregion
		/** Shared Remote contract: the barkNotify contribution this half mounts. */
		const BARK_REMOTE_PACKAGE = "dsh-notify-bark";
		const BARK_REMOTE_NAMESPACE = "barkNotify";
		const barkRemote = {
			package: BARK_REMOTE_PACKAGE,
			descriptors: [
				{
					id: BARK_REMOTE_PACKAGE + "#barkNotify/get",
					service: BARK_REMOTE_NAMESPACE,
					namespace: BARK_REMOTE_NAMESPACE,
					method: "get",
					invocation: { kind: "direct" },
					parameters: [],
					result: { mode: "strict", typeSymbol: "dsh-notify-bark#BarkGetValue", create: () => ({ parse: (value) => value }) },
				},
				{
					id: BARK_REMOTE_PACKAGE + "#barkNotify/set",
					service: BARK_REMOTE_NAMESPACE,
					namespace: BARK_REMOTE_NAMESPACE,
					method: "set",
					invocation: { kind: "direct" },
					parameters: [{ name: "patch", wire: "patch", source: "json", codec: { mode: "strict", typeSymbol: "dsh-notify-bark#BarkSetPatch", create: () => ({ parse: (value) => value }) } }],
					result: { mode: "strict", typeSymbol: "dsh-notify-bark#BarkRecord", create: () => ({ parse: (value) => value }) },
				},
				{
					id: BARK_REMOTE_PACKAGE + "#barkNotify/test",
					service: BARK_REMOTE_NAMESPACE,
					namespace: BARK_REMOTE_NAMESPACE,
					method: "test",
					invocation: { kind: "direct" },
					parameters: [{ name: "group", wire: "group", source: "json", codec: { mode: "strict", typeSymbol: "dsh-notify-bark#BarkGroup", create: () => ({ parse: (value) => value }) }, acceptsUndefined: true }],
					result: { mode: "strict", typeSymbol: "dsh-notify-bark#BarkRecord", create: () => ({ parse: (value) => value }) },
				},
			],
		};

		//#region dsh-notify-bark: locales
		/** Simplified Chinese copy. */
		const zh = {
			"nav": "Bark 通知",
			"repository": "Bark 开源仓库 ↗",
			"intro": "DSH Host 在回合结束、等待回答、等待授权等事件发生时，通过 Bark Server 推送到 iPhone。浏览器关掉也不影响。",
			"loading": "加载中…",
			"loadError": "设置加载失败：{error}",
			"master": "启用 Bark 通知",
			"masterHint": "关闭后不再发送任何推送。",
			"urlLabel": "Bark 推送地址",
			"urlPlaceholder": "https://api.day.app/xxxxxxxx",
			"urlHint": "只填基础推送地址（如 https://api.day.app/xxxxxxxx），不要粘贴 curl 命令或带 /标题/内容 的 GET 链接。官方 Bark 或自建服务均可；地址不会回显，仅显示脱敏状态。",
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
			"repository": "Bark source on GitHub ↗",
			"intro": "The DSH Host pushes to your iPhone through a Bark server when turns end, the agent waits for your answer, or an approval is requested — even with the browser closed.",
			"loading": "Loading…",
			"loadError": "Failed to load settings: {error}",
			"master": "Enable Bark notifications",
			"masterHint": "When off, nothing is pushed.",
			"urlLabel": "Bark push endpoint",
			"urlPlaceholder": "https://api.day.app/xxxxxxxx",
			"urlHint": "Base endpoint only (e.g. https://api.day.app/xxxxxxxx) — do NOT paste a curl command or a GET link with /title/body. Official Bark or a self-hosted server. The value is never shown back; only a masked status is.",
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
		const css = ".dshb_section{max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;display:flex}.dshb_repositoryLink{align-self:flex-start;color:var(--dsw-alias-state-business-primary);font-size:12px;line-height:20px;text-decoration:underline;text-underline-offset:3px}.dshb_repositoryLink:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:3px}.dshb_intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}.dshb_group{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:12px;flex-direction:column;gap:10px;padding:12px 14px;display:flex}.dshb_groupTitle{margin:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary)}.dshb_row{align-items:center;gap:10px;display:flex}.dshb_rowWide{align-items:center;gap:10px;flex-wrap:wrap;display:flex}.dshb_check{color:var(--dsw-alias-label-primary);align-items:center;gap:8px;cursor:pointer;font-size:13px;line-height:20px;display:inline-flex}.dshb_check input{accent-color:var(--dsw-alias-state-business-primary);flex:none}.dshb_checkLabel{min-width:0}.dshb_input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);height:32px;min-width:0;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;flex:1;padding:0 10px;font-size:13px}.dshb_input:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}.dshb_input::placeholder{color:var(--dsw-alias-label-tertiary)}.dshb_num{max-width:110px}.dshb_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}.dshb_mask{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}.dshb_button{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;border-radius:8px;flex:none;padding:5px 12px;font-size:13px}.dshb_button:hover:not(:disabled){border-color:var(--dsw-alias-label-dimmed)}.dshb_button:disabled{opacity:.5;cursor:default}.dshb_status{margin:0;font-size:12px;line-height:18px}.dshb_statusOk{color:var(--dsw-alias-state-success-primary)}.dshb_statusError{color:var(--dsw-alias-state-error-primary)}.dshb_label{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;flex:none}";
		const tagId = "dsh-notify-bark/BarkSettings.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-notify-bark";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		const styles = {
			"section": "dshb_section", "repositoryLink": "dshb_repositoryLink", "intro": "dshb_intro",
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
			constructor(namespace, mounted) {
				this.namespace = namespace;
				this.mounted = mounted;
				this.queue = Promise.resolve();
				this.pendingSaves = 0;
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
				void this.load();
			}
			async fetchIntoStore(preserveError) {
				try {
					await this.mounted;
					const result = await this.namespace.get();
					if (!result.ok) throw new Error(result.error.message);
					this.store.update((draft) => {
						draft.status = "ready";
						draft.settings = result.value.settings;
						draft.urlConfigured = result.value.status.configured;
						draft.urlMasked = result.value.status.masked;
						if (!preserveError) draft.saveError = null;
					});
				} catch (error) {
					if (preserveError) return;
					const message = error instanceof Error ? error.message : String(error);
					this.store.update((draft) => {
						if (draft.settings === null) draft.status = "error";
						draft.saveError = message;
					});
				}
			}
			async load() {
				const task = this.queue.then(async () => {
					if (this.pendingSaves > 0) return;
					await this.fetchIntoStore(false);
				});
				this.queue = task.catch(() => {});
				return task;
			}
			async save(patch) {
				this.pendingSaves += 1;
				this.store.update((draft) => {
					draft.saving = true;
					draft.saveError = null;
					if (draft.settings !== null) {
						const next = { ...draft.settings };
						if (patch.enabled !== undefined) next.enabled = patch.enabled;
						if (patch.events !== undefined) next.events = { ...next.events, ...patch.events };
						if (patch.includeAssistantText !== undefined) next.includeAssistantText = patch.includeAssistantText;
						if (patch.maxBodyChars !== undefined) next.maxBodyChars = patch.maxBodyChars;
						if (patch.group !== undefined) next.group = patch.group;
						draft.settings = next;
					}
				});
				const task = this.queue.then(async () => {
					try {
						await this.mounted;
						const result = await this.namespace.set(patch);
						if (!result.ok) throw new Error(result.error.message);
						if (this.pendingSaves === 1) {
							await this.fetchIntoStore(false);
						}
					} catch (error) {
						this.store.update((draft) => {
							draft.saveError = error instanceof Error ? error.message : String(error);
						});
						if (this.pendingSaves === 1) {
							await this.fetchIntoStore(true);
						}
					} finally {
						this.pendingSaves -= 1;
						if (this.pendingSaves === 0) {
							this.store.update((draft) => { draft.saving = false; });
						}
					}
				});
				this.queue = task.catch(() => {});
				return task;
			}
			async test(group) {
				this.store.update((draft) => { draft.testing = true; draft.testResult = null; });
				try {
					await this.mounted;
					const result = await this.namespace.test(group);
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
			const { t, controller, useSnapshot } = props;
			const snap = useSnapshot((s) => s);
			const [urlDraft, setUrlDraft] = react.useState("");
			const [groupDraft, setGroupDraft] = react.useState(null);
			const [bodyCharsDraft, setBodyCharsDraft] = react.useState(null);
			const [lastSaveArea, setLastSaveArea] = react.useState("url");
			const skipBodyBlurRef = react.useRef(false);
			const skipGroupBlurRef = react.useRef(false);

			react.useEffect(() => {
				void controller.load();
			}, [controller]);

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
				setLastSaveArea("url");
				void controller.save({ events: next });
			};

			const saveUrl = () => {
				const value = urlDraft.trim();
				if (value.length === 0) return;
				setUrlDraft("");
				setLastSaveArea("url");
				void controller.save({ barkUrl: value });
			};

			const commitGroup = (draft) => {
				if (draft === null) return;
				const value = draft.trim();
				setGroupDraft(null);
				const current = controller.store.getSnapshot().settings?.group ?? settings.group;
				if (value.length === 0 || value === current) return;
				setLastSaveArea("content");
				void controller.save({ group: value });
			};

			const saveGroup = () => {
				if (skipGroupBlurRef.current) {
					skipGroupBlurRef.current = false;
					return;
				}
				commitGroup(groupDraft);
			};

			const commitBodyChars = (draft) => {
				if (draft === null) return;
				const parsed = parseBodyCharsDraft(draft);
				setBodyCharsDraft(null);
				const current = controller.store.getSnapshot().settings?.maxBodyChars ?? settings.maxBodyChars;
				if (parsed === null || parsed === current) return;
				setLastSaveArea("content");
				void controller.save({ maxBodyChars: parsed });
			};

			const saveBodyChars = () => {
				if (skipBodyBlurRef.current) {
					skipBodyBlurRef.current = false;
					return;
				}
				commitBodyChars(bodyCharsDraft);
			};

			const onTest = () => {
				const group = groupDraft !== null && groupDraft.trim().length > 0 ? groupDraft.trim() : settings.group;
				void controller.test(group);
			};

			return react_jsx_runtime.jsxs("div", {
				className: styles.section,
				children: [
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
											setLastSaveArea("url");
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
							snap.saveError !== null && lastSaveArea !== "content"
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
											setLastSaveArea("content");
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
										type: "text",
										inputMode: "numeric",
										"aria-label": t("maxBodyChars"),
										placeholder: String(settings.maxBodyChars),
										value: bodyCharsDraft ?? String(settings.maxBodyChars),
										onChange: (e) => {
											skipBodyBlurRef.current = false;
											setBodyCharsDraft(e.target.value);
										},
										onBlur: saveBodyChars,
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												commitBodyChars(bodyCharsDraft);
											} else if (e.key === "Escape") {
												skipBodyBlurRef.current = true;
												setBodyCharsDraft(null);
												e.currentTarget.blur();
											}
										},
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
										"aria-label": t("groupLabel"),
										placeholder: settings.group,
										value: groupDraft ?? settings.group,
										onChange: (e) => {
											skipGroupBlurRef.current = false;
											setGroupDraft(e.target.value);
										},
										onBlur: saveGroup,
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												commitGroup(groupDraft);
											} else if (e.key === "Escape") {
												skipGroupBlurRef.current = true;
												setGroupDraft(null);
												e.currentTarget.blur();
											}
										},
									}),
								],
							}),
							react_jsx_runtime.jsx("p", { className: styles.hint, children: t("groupHint") }),
							snap.saveError !== null && lastSaveArea === "content"
								? react_jsx_runtime.jsx("p", {
										className: styles.statusError,
										role: "alert",
										children: t("saveFailed", { error: snap.saveError }),
									})
								: null,
						],
					}),

					react_jsx_runtime.jsx("a", {
						className: styles.repositoryLink,
						href: "https://github.com/Finb/Bark",
						target: "_blank",
						rel: "noopener noreferrer",
						children: t("repository"),
					}),
				],
			});
		}
		//#endregion

		//#region dsh-notify-bark: plugin entry
		/** Required services (cordis fiber inject; the namespace appears once mounted). */
		const inject = ["slots", "locale", "remote"];

		/**
		 * Register the Bark dictionaries and the settings section.
		 * @param ctx - client root context.
		 */
			function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-notify-bark: dictionaries");

			const mounted = ctx.remote.$mount(barkRemote);
			ctx.inject(["slots", "locale", "remote", "remote.barkNotify"], (scope) => {
				const controller = new BarkSectionController(scope.get("remote.barkNotify"), mounted);
				const t = scope.locale.bind(NS);
				const injected = () => ({ controller, t, hooks: { snapshot: controller.store } });

				scope.slots.inject("settings.section", () => scope.slots.register({
					name: "settings.section",
					id: "bark-notify",
					order: 40,
					label: () => t("nav"),
					inject: injected,
				}, BarkSettingsSection));
			});
		}
		//#endregion

		exports.BarkSectionController = BarkSectionController;
		exports.BarkSettingsSection = BarkSettingsSection;
		exports.parseBodyCharsDraft = parseBodyCharsDraft;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
