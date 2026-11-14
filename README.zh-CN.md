# PDF X-Axis Lock

一个用于 Zotero PDF 阅读器的轻量插件：固定 PDF 当前水平位置，同时保留纵向滚动和 PDF 原生文字选择。

**当前版本：** 1.0.7  
**维护者实机验证环境：** Windows + Zotero 10.0.8。

## 功能

- 在 PDF 阅读器工具栏增加「锁定 X」按钮。
- 锁定当前水平阅读位置，不再通过反复回写 scrollLeft 实现回弹。
- 保留正常上下滚动。
- 保留 PDF.js 原生文字选择和复制。
- 再次点击按钮可以解锁，移除临时裁剪容器并恢复原来的水平位置。

## 安装

从仓库 dist 文件夹下载 XPI。在 Zotero 中打开「工具 → 插件」，点击齿轮菜单中的「从文件安装插件…」，选择 XPI，重启 Zotero 后打开 PDF。先调整缩放和水平位置，再点击「锁定 X」。

## 兼容性

当前 Manifest 面向 Zotero 10.0.x。维护者已在 Windows + Zotero 10.0.8 上完成实机验证。其他 Zotero 版本和操作系统尚未验证。

## 实现原理

插件在 PDF.js 的 #viewer 外层插入临时裁剪层，设置 overflow-x: clip、overflow-y: visible，将 #viewer 按锁定前的水平偏移量平移，然后把 #viewerContainer.scrollLeft 归零。这样可以消除水平滚动范围，而不需要在滚动后反复回弹。插件依赖 Zotero/PDF.js 内部 DOM 结构及 Reader 私有字段，未来版本可能调整这些实现。

## 构建

运行 `python scripts/build_release.py --owner Starshines1`，脚本会在 dist/ 中生成 Manifest、XPI 和 updates.json。

## 许可证

目前尚未指定许可证。GitHub 仓库公开并不自动授予他人修改、再发布或复用代码的权利。仓库所有者选择许可证之前，不应将本项目描述为已授予开源许可。
