# Contributing to ArtyDog

Bug reports, fixes and new features are all welcome.

## Getting set up

Follow [Building from source](README.md#building-from-source) to install the
prerequisites and run the app locally.

## Before opening a pull request

Run the same checks CI does, from the repository root:

```bash
pnpm lint
pnpm test
pnpm build
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --check
cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

## Commit messages

Commits use the `<scope>: <description>` format:

```
overlay: remember the position per monitor
```

The scope is the area you touched. The description is lowercase and
imperative, with no trailing period. The full list of scopes is in
[AGENTS.md](AGENTS.md#commit-messages).

## Changelog entries

Every pull request adds an entry at the top of [CHANGELOG.md](CHANGELOG.md),
above the newest version heading:

```
*   Describe the change.

    Optional detail, wrapped and indented four spaces.

    *[your-username](https://github.com/your-username)*
```

Put your own GitHub username in the last line, so the release notes credit you
when the next version ships. Newest entries go first. If another pull request
added an entry in the same spot, keep both when resolving the conflict.

A check on every pull request fails until `CHANGELOG.md` has your entry.
