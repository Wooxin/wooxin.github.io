---
title: Arch Linux 运行 vLLM 与 Ollama
date: 2026-06-05 14:30:00
category:
  - Linux
  - ArchLinux
  - AI
tags:
  - Linux
  - ArchLinux
  - vLLM
  - Ollama
  - AI
  - GPU
  - 教程
---

> vLLM 跑推理，Ollama 玩模型。一台 Arch 单机搞定所有。

> 别想着AiAgent配合了, 想要真正实现那种效果最低需要70B模型, 推荐132B。

## 硬件前提

- NVIDIA 显卡（我用的 4070 Laptop 8GB）
- 装了 `nvidia` 或 `nvidia-dkms` 驱动
- CUDA Toolkit

验证：

```bash
nvidia-smi
# 应显示 Driver Version 和 CUDA Version

nvcc --version
# 应显示 CUDA 编译工具版本
```

如果 `nvcc` 没装：

```bash
sudo pacman -S cuda cuda-tools
```

## Ollama——本地大模型即开即用

Ollama 把模型下载、量化、推理全打包好了。一条命令就跑。

### 安装

```bash
sudo pacman -S ollama
```

走不通的话用官方脚本：

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 启动服务

```bash
# 启动 ollama 守护进程
ollama serve

# 或者用 systemd
sudo systemctl enable --now ollama
```

### 拉模型

```bash
# 拉 llama3（4.7GB）
ollama pull llama3

# 拉 deepseek-coder（写代码用）
ollama pull deepseek-coder:6.7b

# 拉 qwen2.5（中文友好）
ollama pull qwen2.5:7b

# 查看已下载模型
ollama list
```

### 跑模型

```bash
# 命令行直接对话
ollama run llama3

# 单次提问
ollama run qwen2.5:7b "用 Python 写一个快速排序"
```

### 调参数

GPU 显存不够 8GB 的，调低上下文长度可以塞更大模型：

```bash
# 通过 Modelfile 定制
ollama show qwen2.5:7b --modelfile > Modelfile
```

编辑 `Modelfile`：

```
FROM qwen2.5:7b
PARAMETER num_ctx 2048    # 默认 2048，调大到 4096 吃更多显存
PARAMETER temperature 0.7
```

创建自定义模型：

```bash
ollama create my-qwen -f Modelfile
```

### API 调用

Ollama 自带 OpenAI 兼容 API，默认在 `localhost:11434`：

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:7b",
  "prompt": "什么是滚动更新？",
  "stream": false
}'
```

用 Python 调：

```python
import requests

resp = requests.post("http://localhost:11434/api/generate", json={
    "model": "qwen2.5:7b",
    "prompt": "解释 Linux 内核的 OOM Killer 工作原理",
    "stream": False
})
print(resp.json()["response"])
```

---

## vLLM——高性能推理引擎

Ollama 适合个人玩模型，vLLM 适合把模型部署成高性能 API 服务。vLLM 的核心优势是 PagedAttention——把 KV Cache 像操作系统管理内存一样分页，显存利用率比 HuggingFace Transformers 高 2-4 倍。

### 安装

vLLM 在 Arch 上最简单的方式是用 pip：

```bash
# 创建虚拟环境（不要污染系统 Python）
python -m venv ~/vllm-env
source ~/vllm-env/bin/activate

# 装 vLLM
pip install vllm
```

Arch 的 AUR 也有，但不太跟得上版本：

```bash
yay -S vllm-git
```

### 启动推理服务

```bash
# 启动兼容 OpenAI API 的服务
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.90 \
  --port 8000
```

关键参数：

| 参数 | 作用 |
|---|---|
| `--model` | HuggingFace 模型名或本地路径 |
| `--max-model-len` | 最大上下文长度（越长吃越多显存）|
| `--gpu-memory-utilization` | 显存使用比例，0.9 就是最多吃 90% |
| `--tensor-parallel-size` | 多 GPU 并行，一张卡填 1 |
| `--quantization` | 量化方式：`awq`、`gptq`、`fp8` |

显存不够 8GB 跑 7B 模型的话，加量化：

```bash
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --quantization awq \
  --max-model-len 2048 \
  --port 8000
```

AWQ 量化后的 7B 模型在 6GB 显存就能跑。

### 调 API

```bash
# 列出模型
curl http://localhost:8000/v1/models

# completions
curl http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-7B-Instruct",
    "prompt": "什么是 OOM Killer？",
    "max_tokens": 200,
    "temperature": 0.7
  }'

# chat completions（与 OpenAI 格式一致）
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-7B-Instruct",
    "messages": [
      {"role": "user", "content": "用一句话解释 Linux 内核是什么"}
    ]
  }'
```

### Python 客户端

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="not-needed"  # vLLM 本地不需要 Key
)

response = client.chat.completions.create(
    model="Qwen/Qwen2.5-7B-Instruct",
    messages=[{"role": "user", "content": "什么是 systemd？"}]
)

print(response.choices[0].message.content)
```

---

## Ollama vs vLLM：什么时候用哪个

| | Ollama | vLLM |
|---|---|---|
| 上手难度 | 一条命令 | 需要配置 |
| 模型管理 | 自动下载、量化、缓存 | 手动从 HF 下载或指定路径 |
| 推理性能 | 不错 | 很高（PagedAttention） |
| 并发能力 | 有限 | 支持高并发、连续批处理 |
| 适用场景 | 个人玩/开发调试 | 生产 API 服务 |
| 显存效率 | 一般 | 高（KV Cache 分页管理） |

我的用法：**用 Ollama 快速尝模型、做本地 copilot。确定某个模型好用之后，用 vLLM 部署成服务给其他应用调。**

---

## 常见问题

### 显存不够

8GB 跑 7B 模型刚好，13B 就需要量化了。

```bash
# Ollama 拉量化版
ollama pull qwen2.5:7b-q4_K_M

# vLLM 用 AWQ
python -m vllm.entrypoints.openai.api_server --model xxx --quantization awq
```

### NVIDIA 驱动版本太老

vLLM 对 CUDA 版本有要求。查看兼容性：

```bash
nvidia-smi | grep "CUDA Version"
pip show vllm | grep Version
```

CUDA 12.1+ 基本通吃。不够就升级驱动。

### 内存比显存更先爆

模型加载时需要把权重从磁盘读到内存再传到显存。7B 模型需要大约 14GB 空闲内存。加上系统开销，16GB RAM 跑 7B 模型是底限。

```bash
# 加载模型前先看空闲内存
free -h
```

### 下载模型太慢

HuggingFace 在国内速度感人。换镜像：

```bash
# Ollama 设代理
HTTPS_PROXY=http://127.0.0.1:10808 ollama pull qwen2.5:7b

# vLLM 从 HF 镜像下载
export HF_ENDPOINT=https://hf-mirror.com
huggingface-cli download Qwen/Qwen2.5-7B-Instruct
```

---

一台 Arch，有 Ollama 当玩具箱快速试模型，有 vLLM 当引擎跑生产推理。这就是我现在的 AI 工作流。
