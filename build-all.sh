#!/bin/bash

# 漫剧生成器 - 全平台构建脚本
# 支持 PC (Windows/Mac/Linux)、Android、iOS

set -e

echo "🎨 漫剧生成器 - 全平台构建脚本"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查必要依赖
echo ""
echo "📋 检查依赖..."

if ! command_exists node; then
    echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js 18+${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本: $(node --version)${NC}"
echo -e "${GREEN}✅ npm 版本: $(npm --version)${NC}"

# 获取当前目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo ""
echo "📁 项目目录: $PROJECT_ROOT"

# ============================================
# 构建前端
# ============================================
build_frontend() {
    echo ""
    echo "🔨 步骤 1: 构建前端应用..."
    cd "$FRONTEND_DIR"
    
    # 安装依赖
    echo "   📦 安装前端依赖..."
    npm install
    
    # 构建生产版本
    echo "   🏗️  构建生产版本..."
    npm run build
    
    echo -e "${GREEN}✅ 前端构建完成${NC}"
}

# ============================================
# 构建 PC 端 (Electron)
# ============================================
build_pc() {
    echo ""
    echo "💻 步骤 2: 构建 PC 端应用 (Electron)..."
    cd "$FRONTEND_DIR"
    
    # 检查 electron-builder
    if ! command_exists npx; then
        echo -e "${RED}❌ npx 未找到${NC}"
        return 1
    fi
    
    echo "   🪟 构建 Windows 版本..."
    npm run electron:build:win || echo -e "${YELLOW}⚠️  Windows 构建失败（可能需要 Windows 环境）${NC}"
    
    echo "   🍎 构建 macOS 版本..."
    npm run electron:build:mac || echo -e "${YELLOW}⚠️  macOS 构建失败（可能需要 macOS 环境）${NC}"
    
    echo "   🐧 构建 Linux 版本..."
    npm run electron:build:linux || echo -e "${YELLOW}⚠️  Linux 构建失败${NC}"
    
    echo -e "${GREEN}✅ PC 端构建完成${NC}"
    echo "   📂 输出目录: $FRONTEND_DIR/dist-electron"
}

# ============================================
# 构建 Android 端
# ============================================
build_android() {
    echo ""
    echo "📱 步骤 3: 构建 Android 应用..."
    cd "$FRONTEND_DIR"
    
    # 同步 Capacitor
    echo "   🔄 同步 Capacitor..."
    npx cap sync android
    
    # 检查 Android SDK
    if [ -z "$ANDROID_SDK_ROOT" ] && [ -z "$ANDROID_HOME" ]; then
        echo -e "${YELLOW}⚠️  未检测到 Android SDK，跳过 APK 构建${NC}"
        echo "      如需构建 APK，请安装 Android Studio 并设置 ANDROID_SDK_ROOT"
        return 0
    fi
    
    # 构建 APK
    echo "   🏗️  构建 APK..."
    cd android
    ./gradlew assembleRelease || {
        echo -e "${YELLOW}⚠️  APK 构建失败${NC}"
        return 0
    }
    
    echo -e "${GREEN}✅ Android 构建完成${NC}"
    echo "   📂 APK 输出: $FRONTEND_DIR/android/app/build/outputs/apk/release/"
}

# ============================================
# 构建 iOS 端
# ============================================
build_ios() {
    echo ""
    echo "🍎 步骤 4: 构建 iOS 应用..."
    cd "$FRONTEND_DIR"
    
    # 同步 Capacitor
    echo "   🔄 同步 Capacitor..."
    npx cap sync ios
    
    # 检查是否在 macOS 上
    if [[ "$OSTYPE" != "darwin"* ]]; then
        echo -e "${YELLOW}⚠️  非 macOS 系统，跳过 iOS 构建${NC}"
        echo "      iOS 构建需要在 macOS 上执行"
        return 0
    fi
    
    # 检查 Xcode
    if ! command_exists xcodebuild; then
        echo -e "${YELLOW}⚠️  未检测到 Xcode，跳过 iOS 构建${NC}"
        return 0
    fi
    
    # 构建 iOS
    echo "   🏗️  构建 iOS 应用..."
    cd ios/App
    xcodebuild -workspace App.xcworkspace -scheme App -configuration Release -destination 'generic/platform=iOS' || {
        echo -e "${YELLOW}⚠️  iOS 构建失败${NC}"
        return 0
    }
    
    echo -e "${GREEN}✅ iOS 构建完成${NC}"
}

# ============================================
# 准备后端
# ============================================
prepare_backend() {
    echo ""
    echo "🔧 步骤 5: 准备后端服务..."
    cd "$BACKEND_DIR"
    
    echo "   📦 安装后端依赖..."
    npm install
    
    echo -e "${GREEN}✅ 后端准备完成${NC}"
}

# ============================================
# 创建发布包
# ============================================
create_release_package() {
    echo ""
    echo "📦 步骤 6: 创建发布包..."
    
    RELEASE_DIR="$PROJECT_ROOT/releases"
    mkdir -p "$RELEASE_DIR"
    
    # 复制 PC 端构建产物
    if [ -d "$FRONTEND_DIR/dist-electron" ]; then
        echo "   📋 复制 PC 端构建产物..."
        cp -r "$FRONTEND_DIR/dist-electron" "$RELEASE_DIR/pc" 2>/dev/null || true
    fi
    
    # 复制 Android APK
    if [ -f "$FRONTEND_DIR/android/app/build/outputs/apk/release/app-release-unsigned.apk" ]; then
        echo "   📋 复制 Android APK..."
        cp "$FRONTEND_DIR/android/app/build/outputs/apk/release/app-release-unsigned.apk" "$RELEASE_DIR/漫剧生成器-android.apk"
    fi
    
    # 创建源码包
    echo "   📋 创建源码包..."
    cd "$PROJECT_ROOT"
    tar -czf "$RELEASE_DIR/source-code.tar.gz" \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='dist-electron' \
        --exclude='android' \
        --exclude='ios' \
        --exclude='.git' \
        --exclude='data' \
        --exclude='uploads' \
        --exclude='videos' \
        --exclude='audio' \
        .
    
    echo -e "${GREEN}✅ 发布包创建完成${NC}"
    echo "   📂 发布目录: $RELEASE_DIR"
    ls -lh "$RELEASE_DIR" 2>/dev/null || true
}

# ============================================
# 主流程
# ============================================
main() {
    echo ""
    echo "🚀 开始全平台构建流程..."
    echo ""
    
    # 解析参数
    BUILD_PC=false
    BUILD_ANDROID=false
    BUILD_IOS=false
    
    if [ $# -eq 0 ]; then
        # 默认构建所有平台
        BUILD_PC=true
        BUILD_ANDROID=true
        BUILD_IOS=true
    else
        for arg in "$@"; do
            case $arg in
                --pc) BUILD_PC=true ;;
                --android) BUILD_ANDROID=true ;;
                --ios) BUILD_IOS=true ;;
                --all)
                    BUILD_PC=true
                    BUILD_ANDROID=true
                    BUILD_IOS=true
                    ;;
                --help)
                    echo "用法: $0 [选项]"
                    echo ""
                    echo "选项:"
                    echo "  --pc       只构建 PC 端"
                    echo "  --android  只构建 Android 端"
                    echo "  --ios      只构建 iOS 端"
                    echo "  --all      构建所有平台 (默认)"
                    echo "  --help     显示帮助信息"
                    exit 0
                    ;;
                *)
                    echo -e "${RED}❌ 未知选项: $arg${NC}"
                    echo "使用 --help 查看帮助"
                    exit 1
                    ;;
            esac
        done
    fi
    
    # 执行构建
    build_frontend
    prepare_backend
    
    if [ "$BUILD_PC" = true ]; then
        build_pc
    fi
    
    if [ "$BUILD_ANDROID" = true ]; then
        build_android
    fi
    
    if [ "$BUILD_IOS" = true ]; then
        build_ios
    fi
    
    create_release_package
    
    echo ""
    echo "================================"
    echo -e "${GREEN}🎉 全平台构建完成！${NC}"
    echo ""
    echo "📂 构建输出:"
    echo "   • PC 端: $FRONTEND_DIR/dist-electron/"
    echo "   • Android: $FRONTEND_DIR/android/app/build/outputs/apk/release/"
    echo "   • iOS: $FRONTEND_DIR/ios/"
    echo "   • 发布包: $PROJECT_ROOT/releases/"
    echo ""
    echo "📖 使用说明:"
    echo "   • PC 端: 运行 dist-electron 中的安装程序"
    echo "   • Android: 安装 apk 文件到 Android 设备"
    echo "   • iOS: 使用 Xcode 打开 ios/App/App.xcworkspace 并部署"
    echo ""
}

# 运行主流程
main "$@"
