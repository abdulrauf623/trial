#!/bin/bash

echo "==========================================="
echo "Fashion App - Slices 5-10 Verification"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1"
        return 1
    fi
}

echo "📱 Mobile Files (Slice 5-7):"
echo "----------------------------"
check_file "apps/mobile/src/screens/UserProfileScreen.tsx"
check_file "apps/mobile/src/components/ReportModal.tsx"
check_file "apps/mobile/src/components/AnimatedButton.tsx"
check_file "apps/mobile/src/components/WardrobeCollectionCard.tsx"
check_file "apps/mobile/src/screens/OutfitBuilderScreen.tsx"
check_file "apps/mobile/src/hooks/useAnimatedPress.ts"
check_file "apps/mobile/src/hooks/useParallax.ts"
check_file "apps/mobile/src/hooks/useDragAndDrop.ts"
check_file "apps/mobile/src/utils/animations.ts"

echo ""
echo "🔍 Search & AI Files (Slice 8-9):"
echo "----------------------------"
check_file "apps/mobile/src/screens/SearchScreen.tsx"
check_file "apps/api/src/search/search.service.ts"
check_file "apps/api/src/search/search.controller.ts"
check_file "apps/api/src/search/search.module.ts"
check_file "apps/api/src/ai/ai.service.ts"
check_file "apps/api/src/ai/ai.module.ts"
check_file "apps/api/src/queue/queue.service.ts"
check_file "apps/api/src/queue/queue.module.ts"

echo ""
echo "📊 Logging & Polish (Slice 10):"
echo "----------------------------"
check_file "apps/api/src/logger/logger.service.ts"
check_file "apps/api/src/logger/logger.module.ts"
check_file "apps/api/src/common/performance.interceptor.ts"
check_file "apps/api/src/scripts/test-setup.ts"

echo ""
echo "📚 Documentation:"
echo "----------------------------"
check_file "IMPLEMENTATION_GUIDE.md"
check_file "SLICES_5-10_SUMMARY.md"
check_file "QUICK_START.md"

echo ""
echo "🔧 Configuration:"
echo "----------------------------"
check_file "apps/mobile/babel.config.js"

# Check babel config has reanimated plugin
if grep -q "react-native-reanimated/plugin" apps/mobile/babel.config.js; then
    echo -e "${GREEN}✓${NC} Reanimated plugin configured in babel.config.js"
else
    echo -e "${RED}✗${NC} Reanimated plugin missing in babel.config.js"
fi

# Check if dependencies are installed
echo ""
echo "📦 Dependencies:"
echo "----------------------------"

if [ -d "node_modules/react-native-reanimated" ]; then
    echo -e "${GREEN}✓${NC} react-native-reanimated installed"
else
    echo -e "${RED}✗${NC} react-native-reanimated NOT installed"
fi

if [ -d "node_modules/react-native-gesture-handler" ]; then
    echo -e "${GREEN}✓${NC} react-native-gesture-handler installed"
else
    echo -e "${RED}✗${NC} react-native-gesture-handler NOT installed"
fi

# Check schema has pgvector
echo ""
echo "💾 Database Schema:"
echo "----------------------------"

if grep -q "vector(768)" apps/api/src/prisma/schema.prisma; then
    echo -e "${GREEN}✓${NC} pgvector columns added to schema"
else
    echo -e "${RED}✗${NC} pgvector columns missing from schema"
fi

if grep -q "pgvector" apps/api/src/prisma/schema.prisma; then
    echo -e "${GREEN}✓${NC} pgvector extension configured"
else
    echo -e "${RED}✗${NC} pgvector extension not configured"
fi

echo ""
echo "🧪 TypeScript Compilation:"
echo "----------------------------"
echo "Running type check..."

if pnpm typecheck > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} All packages pass TypeScript compilation"
else
    echo -e "${RED}✗${NC} TypeScript compilation errors exist"
    echo "Run 'pnpm typecheck' for details"
fi

echo ""
echo "==========================================="
echo "Verification Complete!"
echo "==========================================="
echo ""
echo "Next steps:"
echo "1. Run 'pnpm infra:up' to start PostgreSQL"
echo "2. Run 'pnpm db:push' to apply schema"
echo "3. Run 'pnpm api' to start backend"
echo "4. Run 'pnpm mobile' to start mobile app"
echo ""
echo "See QUICK_START.md for detailed instructions."
echo ""
