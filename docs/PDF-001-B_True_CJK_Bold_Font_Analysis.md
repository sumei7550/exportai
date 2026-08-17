# PDF-001-B True CJK Bold Font Support

## 归档状态

- 状态：分析完成，待实施
- 日期：2026-08-17
- 范围：仅字体资产、字体格式和 jsPDF 兼容性
- 已完成前置：PDF-001-A（CJK Regular、inline code、code block、table fallback）
- 本次未修改 PDF layout、renderer style、pagination、conversation model、export flow、adapter 或 parser

## 结论

当前仓库没有可直接用于 jsPDF 的 Noto Sans SC Bold TrueType 字体。

现有 Bold 资产是 CFF OTF：

```text
src/assets/fonts/NotoSansSC-Bold.otf
signature: OTTO
size: 17,002,248 bytes
```

当前生产代码仍将 `NotoSansSC-Regular.ttf` 注册为 `normal`、`bold`、`italic` 和 `bolditalic`。因此当前 Bold 是 Regular 伪装，不满足 True CJK Bold 要求。

推荐优先获取官方静态 Simplified Chinese Bold TrueType 字体，避免直接把 CFF OTF 交给当前 jsPDF 解析路径。只有无法获取静态 TTF 时，才评估 `NotoSansSC-Bold.otf` 的离线 OTF(CFF) → TTF 转换。

## 现有资产盘点

| 文件 | 格式 | 结果 |
| --- | --- | --- |
| `src/assets/fonts/NotoSansSC-Regular.otf` | OpenType CFF (`OTTO`) | 不作为当前 jsPDF 生产输入 |
| `src/assets/fonts/NotoSansSC-Bold.otf` | OpenType CFF (`OTTO`) | 现有 Bold，但当前解析路径不兼容 |
| `src/assets/fonts-test/NotoSansSC-Regular.ttf` | TrueType (`00 01 00 00`) | 当前已验证的 Regular 输入 |
| `src/assets/fonts-subset/NotoSansSC-Regular.ttf` | TrueType subset | Regular subset，不是 Bold |
| `src/assets/fonts-subset/NotoSansSC-Subset.ttf` | TrueType subset | Regular subset，不是 Bold |

仓库中没有 `NotoSansSC-Bold.ttf`、`NotoSansCJK-Bold.ttf` 或 Bold jsPDF 字体模块。`src/assets/fonts/README.md` 提到的 `NotoSansSC-Bold.ttf` 实际不存在，文档描述需要在后续资产落地后同步。

## 供给评估

上游 Noto CJK 发布物提供 TrueType 发行形态。应优先获取静态、单字体、Simplified Chinese Bold TTF，例如对应的 `NotoSansCJKsc-Bold.ttf`。不应直接选择 TTC、OTC、CFF/CFF2 或 variable font 作为当前 jsPDF 输入；如来源只有字体集合，则必须先拆分为单字体并重新验证。

## 推荐方案

### 方案 A：使用官方静态 Bold TTF（推荐）

```text
官方静态 Noto Sans CJK SC Bold TTF
        ↓
检查 TrueType 表和 Unicode cmap
        ↓
生成 jsPDF 字体模块
        ↓
Regular / Bold 分别注册
        ↓
验证显示、复制和搜索
```

最终应形成独立资产：

```text
NotoSansSC-Regular.ttf
NotoSansSC-Bold.ttf
```

并分别映射到：

```text
NotoSansSC / normal
NotoSansSC / bold
```

不得继续用 Regular 文件注册 `bold`。

### 方案 B：离线转换现有 CFF OTF（备选）

项目已有 `otf2ttf` 依赖，可以尝试将现有 Bold OTF 转换为 TTF。但转换成功不等于 jsPDF 和 PDF ToUnicode 兼容，必须在接入前完成完整验证。

## 转换验收要求

### 字体表

转换产物必须满足：

- 具备 `glyf` TrueType 轮廓表；
- 不能仍然只有 `CFF` 或 `CFF2` 轮廓；
- 具备 `cmap`、`head`、`hhea`、`hmtx`、`maxp`、`name` 和 `OS/2` 等必要表；
- 不是未拆分的 TTC/字体集合；
- 许可证和字体名称元数据可追溯。

### Unicode cmap 和 glyph mapping

至少验证以下类别：

- CJK：`你`、`好`、`中`、`文`、`测`、`试`、`世`、`界`；
- 标点：`，`、`。`、全角括号和常见表格符号；
- ASCII、数字和代码符号。

验收目标是 Unicode code point 能映射到正确的非 `.notdef` glyph，不要求转换前后 glyph ID 保持不变。

### PDF ToUnicode

必须验证：

1. Bold 中文视觉显示正确；
2. 复制 Bold 中文得到原文；
3. PDF 搜索 Bold 中文可以命中；
4. Regular 和 Bold 同时出现时不串字；
5. 不出现拉丁字符乱码、方框或空白 glyph。

字体自身的 `cmap` 正确，并不自动保证 jsPDF 生成的 PDF ToUnicode CMap 正确；两者必须分别验证。

## 风险

1. CFF → TrueType 转换可能保留 cmap，但不保证 jsPDF 生成正确的 PDF ToUnicode 映射。
2. 完整 CJK Bold 字体体积较大，与 Regular 同时嵌入会增加扩展包和构建 bundle 体积。
3. Bold 与 Regular 的字符覆盖范围可能不同，需要检查产品实际输入字符。
4. TTC、OTC 和 variable font 即使扩展名看似可用，也可能不适合当前 jsPDF 路径。
5. 若转换工具改变字体名称，需遵守 Noto 字体 SIL OFL 许可中的 Reserved Font Name 要求。

## 后续允许修改范围

PDF-001-B 实施时，修改范围应限于：

- 新增官方 Bold TTF 或经验证的转换产物；
- 新增对应 jsPDF 字体模块和类型声明；
- 修改 `src/exporters/pdf-engine.ts`，让 Regular 与 Bold 独立注册；
- 新增字体表、cmap、glyph mapping 和 PDF 文本复制/搜索验证；
- 必要时更新 `src/assets/fonts/README.md` 的实际资产清单。

不得借此修改：

- PDF layout；
- message hierarchy；
- block renderer 样式；
- pagination；
- conversation model；
- export flow；
- adapter；
- parser。

## 归档判断

PDF-001-B 当前结论为：**字体资产缺失，分析完成，实施未开始**。

推荐下一步是先引入并验证官方静态 `NotoSansCJKsc-Bold.ttf`。在真实 Bold TTF 和字体映射验证完成前，不应宣称 True CJK Bold 已完成，也不应继续使用 Regular 字体伪装 Bold。

## 参考

- [Noto CJK 官方仓库](https://github.com/notofonts/noto-cjk)
- [Noto Sans CJK 下载说明](https://github.com/notofonts/noto-cjk/blob/main/Sans/README.md)
- [Noto CJK Releases](https://github.com/notofonts/noto-cjk/releases)
