---
title: Rust + Tauri 2 开发中踩过的坑
date: 2026-06-12 16:00:12
category:
  - Rust
  - Tauri
  - 开发
tags:
  - Rust
  - Tauri
  - serde
  - SQLite
  - 疑难杂症
  - 桌面开发
description: 用 Rust + Tauri 2 写了三个桌面应用后，总结的八个让人想砸键盘的疑难杂症。
---

写这篇文章的原因是 —— 我用 Rust + Tauri 2 写了三个桌面应用（WoxNote、WoxMail、WoxCode），期间踩了无数坑，有些坑一踩就是半天，排查到怀疑人生。趁着还记得，赶紧记下来。
尽管有AIAgent帮助我进行项目进度，但是真到了使用的时候还是会出一些奇奇怪怪的问题

这三个项目加起来 Rust 代码估计有六七千行了，大部分坑都是 Tauri 2 IPC 层面的问题 —— JS 调 Rust 不出错，但就是**沉默失败**。这种 bug 最恶心，不报错、不打日志，就是你点个按钮啥反应没有，然后你开始怀疑人生。

> 事先声明：这篇文章不说"入门教程"那些事，只说那些让你想砸键盘的疑难杂症。

---

## 一、#[serde(default)] —— 沉默杀手

这绝对是我踩过最深的坑。

### 问题现象

前端 JS 调用 Tauri command，传了一个结构体：

```typescript
// JS 端
await invoke('save_user_config', {
  config: {
    theme: 'light',
    language: 'en',
    // 其他字段故意不传
  }
})
```

Rust 端：

```rust
#[derive(Deserialize)]
pub struct UserConfig {
    pub theme: String,
    pub language: String,
    pub font_size: u32,
    pub activity_expanded: bool,
    pub workspaces: Vec<String>,
    // ...几十个字段
}

#[tauri::command]
pub fn save_user_config(config: UserConfig) -> Result<(), String> {
    // config.theme = "light" ✅
    // config.language = "en" ✅
    // config.font_size = 0   🤔 等等...
    // config.activity_expanded = false  😱
    // config.workspaces = []  💀
    Ok(())
}
```

**命令执行了，没有报错**，但你那些没传的字段全部变成默认值（`0`、`false`、空字符串），然后静默地把这些垃圾值写进了数据库。你一刷新 —— 字体变成 0、设置全乱了。

### 根源

Tauri 在反序列化 JS 传过来的 JSON 时，用的是 serde。默认情况下，**缺少的字段会直接导致反序列化失败** —— 这听起来是好事对吧？问题在于 Tauri **不会把反序列化错误抛给前端**，它只会在后台打个 warn 日志，然后命令根本不会执行。

所以你要么所有字段都传，要么就必须加 `#[serde(default)]`。但如果你加了 default，serde 就会**安静地用默认值填充缺失字段** —— 又是一个坑。

### 正确的做法

```rust
#[derive(Deserialize, Default)]
#[serde(default)]  // ← 这一行是关键
pub struct UserConfig {
    #[serde(default = "default_theme")]
    pub theme: String,           // → "dark"
    #[serde(default)]
    pub language: String,        // → ""（空字符串）
    #[serde(default = "default_font_size")]
    pub font_size: u32,          // → 14
    #[serde(default)]
    pub activity_expanded: bool, // → false
    #[serde(default)]
    pub workspaces: Vec<String>, // → vec![]
}

fn default_theme() -> String { "dark".into() }
fn default_font_size() -> u32 { 14 }

impl Default for UserConfig {
    fn default() -> Self { /* 明确写出所有默认值 */ }
}
```

**三个关键点：**

| 层级 | 作用 | 没有会怎样 |
|---|---|---|
| `#[serde(default)]` 在 struct 上 | JS 传部分字段时不报错 | 反序列化失败 → 命令静默不执行 |
| `#[serde(default = "fn")]` 在字段上 | 为关键字段设业务默认值 | 字段变成类型默认值（0、false、空串） |
| `impl Default` | Rust 代码里手动构造时也能用 | 写起来麻烦，但和 serde 那层互相独立 |

> 血的教训：**所有 Tauri command 的参数结构体，第一时间就加上 `#[serde(default)]` 和 `Default` trait**。别等到出了 bug 再加，那时候数据库已经被污染了。

---

## 二、camelCase 和 snake_case 的战争

这个坑和上面那个是一对孪生兄弟。

### 问题

JS 传的是 `camelCase`：

```typescript
await invoke('save_settings', {
  settings: {
    vaultsJson: '[...]',      // 驼峰
    activeVault: '/notes',
    showQuickSettings: true,
  }
})
```

Rust 这边字段名是 `snake_case`：

```rust
#[derive(Deserialize)]
pub struct UserSettings {
    pub vaults_json: String,        // 蛇形
    pub active_vault: String,
    pub show_quick_settings: bool,
}
```

**字段名不匹配 → 反序列化失败 → 命令静默不执行。**

你可能心想："我加 `#[serde(rename_all = "camelCase")]` 不就行了？"

对，但注意这个 `rename_all` 只处理 **serde 的序列化/反序列化**。如果你的 Rust 代码内部还用到了这些字段名做别的事（比如存 SQLite 的 key），那你得想清楚到底哪层用驼峰、哪层用蛇形。

### 三个项目里的实际做法

我在三个项目里统一的做法是 —— **对外（JS 通信）用 camelCase，对内（Rust 内部）也用 camelCase**。所有 struct 都加上：

```rust
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserSettings {
    pub vaults_json: String,    // Rust 里写 snake_case
    pub active_vault: String,   // 但序列化后是 "vaultsJson" / "activeVault"
}
```

然后 SQLite key 直接用驼峰字符串：

```rust
// 数据库里的 key 是驼峰
load_str!(settings, &conn, "vaultsJson", vaults_json);   // key = "vaultsJson"
load_bool!(settings, &conn, "showQuickSettings", show_quick_settings);
```

这样 Rust 代码里写变量是蛇形，但数据库和 JS 通信层都是驼峰，不会混淆。

> 坑点总结：**serde 不会自动做 snake_case ↔ camelCase 转换。** 不加 `rename_all`，JS 的 `activeVault` 和 Rust 的 `active_vault` 就是两个世界的东西。而且这个错误是**沉默的** —— Tauri 不会告诉你"字段名不匹配"。

---

## 三、rusqlite 的 QueryReturnedNoRows —— 不是 Err 的 Err

这个坑属于 Rust 类型系统的"善意"带来的"恶意"。

### 问题

你在 rusqlite 里查一条数据，没查到：

```rust
let row = conn.query_row(
    "SELECT value FROM settings WHERE key = ?1",
    params!["theme"],
    |row| row.get::<_, String>(0),
);

match row {
    Ok(value) => { /* 用 value */ },
    Err(e) => { /* 报错？ */ },
}
```

你可能会想"没查到就返回 Err，我 match 一下就好了"。**错。**

`query_row` 没查到数据时返回的不是普通的 `Err(String)`，而是 **`rusqlite::Error::QueryReturnedNoRows`**。如果你用 `e.to_string()` 把它转成字符串再返回给前端，前端拿到的是一个 SQLite 错误码，完全不知道这是什么。

### 正确的处理

```rust
let row = conn.query_row(/* ... */);
match row {
    Ok(value) => Ok(Some(value)),
    Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),  // ← 单独处理
    Err(e) => Err(format!("数据库查询失败: {}", e)),
}
```

在 WoxMail 里这种模式出现了几十次，比如查 OAuth token、查联系人、查密码：

```rust
// 模式：把 QueryReturnedNoRows 转成 None，其他错误才报
let existing = db.with_conn(|conn| {
    let row = conn.query_row("SELECT id, name FROM accounts WHERE ...", params![...], |row| {
        Ok(Account { id: row.get(0)?, name: row.get(1)?, ... })
    });
    match row {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
})?;
```

> 这东西烦就烦在你不能直接 `?` 然后统一处理，必须在每个查询点都显式 match。如果你偷懒用 `.ok()` 吞掉所有错误，那真正的 SQL 语法错误也一起被吞了。

---

## 四、spawn_blocking —— UI 不卡死的秘密

Tauri 的 command 默认跑在主线程上。如果你在 command 里做了文件 I/O、网络请求、正则匹配几百个文件，**整个窗口直接卡死**。

### 三个项目的做法

WoxCode 的文件内容搜索是个典型案例：

```rust
#[tauri::command]
pub async fn search_content(
    directory: String,
    query: String,
    case_sensitive: bool,
    use_regex: bool,
) -> Result<Vec<SearchMatch>, String> {
    //                        ↓ 关键在这里
    tauri::async_runtime::spawn_blocking(move || {
        // 这里面可以写同步代码
        // WalkDir 遍历所有文件
        // Regex 匹配内容
        // 读文件、排序
        // 全部不会阻塞 UI
        // ...
        Ok(results)
    }).await.map_err(|e| e.to_string())?
}
```

`spawn_blocking` 把重活扔到线程池，主线程继续渲染 UI。搜索结果回来了再更新界面。

WoxMail 的邮件同步、WoxNote 的全文索引也都是这个模式 —— **所有 I/O 操作必须走 spawn_blocking**。

| 操作 | 在主线程做 | 用 spawn_blocking 做 |
|---|---|---|
| 读写 SQLite | 可能卡（视数据量） | ✅ |
| 读几百个文件 | 💀 卡死 | ✅ |
| IMAP 网络请求 | 💀 卡死 | ✅ |
| FTS5 全文搜索 | 轻微卡顿 | ✅ |
| 简单内存计算 | ✅ | 不需要 |

> 一句话：**Rust command 函数签一个 `async`，函数体里用 `spawn_blocking` 包裹所有 I/O**。养成肌肉记忆。

---

## 五、单实例锁 —— TCP 端口占坑法

桌面应用要防止用户双击 exe 打开两个实例。常见做法是用命名互斥体（Windows 的 `CreateMutex`），但 Tauri 2 + Rust 里有一个更简单、跨平台的方法：

```rust
// 在 app run() 的最开始
let _lock = std::net::TcpListener::bind("127.0.0.1:19877");
if _lock.is_err() {
    std::process::exit(0);  // 端口被占 → 已有实例在跑 → 退出
}
```

三个项目用的端口分别是：
- WoxNote → `19876`
- WoxCode → `19877`
- WoxMail → `CreateMutexW`（Windows API）

TCP 端口绑定的好处是完全不需要 unsafe 和平台相关的 API，跨平台天然能用。缺点是要占一个端口号，如果用户那个端口刚好被其他程序占了就凉了 —— 不过 127.0.0.1 的高位端口基本不会有冲突。

> 注意：`_lock` 变量前面有下划线，但它**不能被 drop**。TcpListener 的 `Drop` 实现会释放端口，所以必须保持 `_lock` 存活到程序退出。

---

## 六、SQLite 的 WAL 模式 + PRAGMA

SQLite 默认是 journal mode = delete，并发读写性能拉胯。尤其是 WoxMail 这种要同时 IMAP sync + UI 查询的，必须开 WAL：

```rust
fn configure(conn: &Connection) {
    conn.execute_batch(r#"
        PRAGMA journal_mode = WAL;       -- 写不阻塞读
        PRAGMA synchronous = NORMAL;      -- 不全同步（WAL 模式下安全）
        PRAGMA busy_timeout = 5000;       -- 锁等待 5s 而非立即报错
        PRAGMA temp_store = MEMORY;       -- 临时表放内存
        PRAGMA cache_size = -32768;       -- 32MB 缓存（负数是 KB）
    "#).expect("failed to configure sqlite db");
}
```

每个 PRAGMA 的坑：

| PRAGMA | 作用 | 不设置的后果 |
|---|---|---|
| `journal_mode = WAL` | 读写并发 | 写的时候整个 DB 锁死 |
| `synchronous = NORMAL` | WAL 模式下足够安全 | FULL 模式每次 fsync，极慢 |
| `busy_timeout = 5000` | 遇到锁等 5s | 立即返回 `database is locked` |
| `temp_store = MEMORY` | 临时表内存化 | 大量临时文件 I/O |
| `cache_size = -32768` | 页面缓存 32MB | 默认 2MB，大表查询频繁读盘 |

> 还有一个坑：**FTS5 全文索引必须手动触发初始填充**。如果你 CREATE TABLE messages 之后再创建 FTS5 虚拟表，之前的数据不会自动索引，需要手动 `INSERT INTO messages_fts(messages_fts) VALUES ('rebuild')`。

---

## 七、Windows 路径的 `\\` 地狱

Windows 返回的路径分隔符是 `\`，但前端和 Web 世界里统一用 `/`。不处理的话路径比较、路径拼接都会出稀奇古怪的问题。

三个项目里统一的处理：

```rust
let relative = path
    .strip_prefix(&root)
    .unwrap_or(path)
    .to_string_lossy()
    .replace('\\', "/");   // ← 这一行
```

读取文件时 `safe_join_path` 要防 `../` 攻击：

```rust
pub fn safe_join_path(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let relative = Path::new(relative_path);
    if relative.components().any(|component| {
        matches!(component, Component::Prefix(_) | Component::RootDir | Component::ParentDir)
    }) {
        return Err("File path escapes the vault".into());
    }
    Ok(root.join(relative))
}
```

`Component::ParentDir` 就是 `..`，`Component::RootDir` 就是 `/` 或 `C:\`。把这些都拦住，确保文件操作不出库。

---

## 八、Tauri 2 的 State 管理

Tauri 2 里的 `State` 是全局数据共享的机制。但 Rust 的所有权模型下，你必须用 `Arc<Mutex<T>>` 包装：

```rust
// WoxCode — LSP 状态
app.manage(Arc::new(Mutex::new(LspState::new())));

// WoxNote — 文件监视器
app.manage(VaultManager::new());  // VaultManager 实现了 Clone，内部用 Arc

// WoxMail — 数据库连接
pub struct AppState {
    pub db: Db,  // Db 内部是 Arc<Mutex<Connection>>
}
```

消费端：

```rust
#[tauri::command]
pub fn search_vault(
    query: String,
    manager: State<'_, VaultManager>,  // ← Tauri 自动注入
) -> Result<Vec<SearchResult>, String> {
    manager.search_vault(&query)
}
```

坑点：
- **State 必须提前 `.manage()` 注册**，不然 command 执行的时候直接 panic。
- **如果 State 里的数据需要在多个线程用，必须用 Arc**。`State` 本身不是 `Send + Sync` 的。
- 用了 `Mutex` 就别在锁内做耗时操作（比如网络请求），不然所有 command 排队等锁。

---

## 总结

写了三个 Tauri 2 项目，最大的感受是：

1. **沉默失败是最大的敌人。** `#[serde(default)]` 和 `rename_all` 一定要第一时间加上，晚加一天都是对生命的不尊重。

2. **Rust 的类型系统帮你拦截了很多 bug，但也制造了很多"看起来能编译但行为不对"的陷阱。** `QueryReturnedNoRows` 就是个典型。

3. **异步 I/O 不是可选的。** 所有文件、网络、数据库操作都必须 `spawn_blocking`，不然用户以为你写的软件是半成品。

4. **SQLite + WAL 模式是小桌面应用的黄金搭档。** 配合 FTS5 全文搜索，几百 MB 的数据也能秒查。

以后遇到新坑再补充。这篇文章就当是给 Tauri 后来者的一份"避坑指南"。

---

> 2026 年 6 月，写于写了三个 Tauri 项目之后。

