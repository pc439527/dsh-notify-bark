# add: dsh-notify-bark (Bark push notifications)

Adds [pc439527/dsh-notify-bark](https://github.com/pc439527/dsh-notify-bark) to the **Notifications & Integrations** section in both `README.md` and `README.zh.md`.

## Checklist

- [x] `package.json` declares `dsh.bundle` (`patch: ./cordis.patch.yml`) → installable via `dsh plugin add`
- [x] Real working code (Host-side event listener + Bark HTTP sender, Web settings UI via `dsh.client`)
- [x] MIT license, actively maintained
- [x] `dsh-plugin` topic added to the repo
- [x] `@deepseek-ai/*` declared as `peerDependencies`

Install: `dsh plugin --profile web add https://github.com/pc439527/dsh-notify-bark.git`
