#!/bin/bash
# E2E Test Runner for Pagepoof API
# Usage: ./scripts/e2e-test.sh [--verbose]

API="https://pagepoof-api.paolo-moz.workers.dev/api/stream"
VERBOSE=${1:-""}
PASSED=0
FAILED=0
TMPDIR="${TMPDIR:-/tmp}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  Pagepoof E2E Test Suite"
echo "  $(date)"
echo "=========================================="
echo ""

# Helper function to fetch SSE response
# Writes to temp file, kills curl after we have layout event
fetch_sse() {
    local url=$1
    local timeout_secs=${2:-45}
    local tmpfile="$TMPDIR/e2e_response_$$_$(date +%s%N).txt"

    # Start curl in background, write to temp file
    curl -sN "$url" > "$tmpfile" 2>/dev/null &
    local curl_pid=$!

    # Wait for layout event or timeout
    local elapsed=0
    while [[ $elapsed -lt $timeout_secs ]]; do
        sleep 1
        ((elapsed++))

        # Check if we have the layout event (generation complete)
        if [[ -f "$tmpfile" ]] && grep -q "event: layout" "$tmpfile" 2>/dev/null; then
            # Give it one more second to finish writing the layout data
            sleep 1
            break
        fi

        # Check if curl has exited
        if ! kill -0 $curl_pid 2>/dev/null; then
            break
        fi
    done

    # Kill curl if still running
    kill $curl_pid 2>/dev/null
    wait $curl_pid 2>/dev/null

    # Output the response
    if [[ -f "$tmpfile" ]]; then
        cat "$tmpfile"
        rm -f "$tmpfile"
    fi
}

# Helper function to run a test
run_test() {
    local id=$1
    local query=$2
    local check_field=$3
    local expected=$4
    local description=$5

    # URL encode the query
    local encoded_query=$(echo "$query" | sed 's/ /+/g' | sed 's/\$/%24/g')

    # Fetch response
    local response
    response=$(fetch_sse "$API?query=$encoded_query" 45)

    if [[ -z "$response" ]]; then
        echo -e "${RED}FAIL${NC} [$id] $description"
        echo "  Error: Empty response or timeout"
        ((FAILED++))
        return 1
    fi

    # Extract the relevant event data based on check_field
    # Uses Python for JSON parsing since jq may not be installed
    local actual=""
    local json_data=""

    case $check_field in
        "type"|"confidence")
            json_data=$(echo "$response" | grep "event: classification" -A1 | grep "data:" | head -1 | sed 's/data: //')
            if [[ -n "$json_data" ]]; then
                actual=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d.get('$check_field',''))" "$json_data" 2>/dev/null || echo "")
            fi
            ;;
        "products"|"faqs"|"videos")
            json_data=$(echo "$response" | grep "event: retrieval" -A1 | grep "data:" | head -1 | sed 's/data: //')
            if [[ -n "$json_data" ]]; then
                actual=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d.get('$check_field',0))" "$json_data" 2>/dev/null || echo "0")
            fi
            ;;
        "success")
            if echo "$response" | grep -q "event: layout"; then
                actual="true"
            else
                actual="false"
            fi
            ;;
        "blockCount")
            json_data=$(echo "$response" | grep "event: layout" -A1 | grep "data:" | head -1 | sed 's/data: //')
            if [[ -n "$json_data" ]]; then
                actual=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d.get('blockCount',0))" "$json_data" 2>/dev/null || echo "0")
            fi
            ;;
        "hero_exists")
            actual=$(echo "$response" | grep -c "event: block" 2>/dev/null || echo "0")
            ;;
    esac

    # Validate based on expected value format
    local pass=false
    case $expected in
        ">="*)
            local threshold=${expected#>=}
            local actual_int=${actual%.*}
            local threshold_int=${threshold%.*}
            if [[ "$actual_int" =~ ^[0-9]+$ ]] && [[ $actual_int -ge $threshold_int ]]; then
                pass=true
            fi
            ;;
        "="*)
            local exact=${expected#=}
            if [[ "$actual" == "$exact" ]]; then
                pass=true
            fi
            ;;
        *)
            if [[ "$actual" == "$expected" ]]; then
                pass=true
            fi
            ;;
    esac

    if $pass; then
        echo -e "${GREEN}PASS${NC} [$id] $description"
        if [[ "$VERBOSE" == "--verbose" ]]; then
            echo "  Expected: $expected, Actual: $actual"
        fi
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} [$id] $description"
        echo "  Expected: $expected, Actual: $actual"
        ((FAILED++))
    fi

    # Small delay between tests to avoid rate limiting
    sleep 1
}

echo "=== Classification Tests ==="
run_test "C1" "Which Vitamix should I buy" "type" "product" "Product query classification"
run_test "C2" "How do I make a green smoothie" "type" "recipe" "Recipe query classification"
run_test "C4" "I have arthritis and need an easy blender" "type" "product" "Accessibility query -> product"
run_test "C5" "What is the quietest Vitamix for apartments" "type" "product" "Noise query -> product"
run_test "C7" "Best blender under \$350" "type" "product" "Budget query -> product"

echo ""
echo "=== Retrieval Tests ==="
run_test "R1" "Compare Ascent A3500 vs E320" "products" ">=2" "Product comparison retrieval"
run_test "R2" "Vitamix warranty information" "faqs" ">=1" "Warranty FAQ retrieval"
run_test "R5" "Which Vitamix blender is best" "products" ">=3" "General product retrieval"

echo ""
echo "=== Special Context Tests ==="
# S1 tests accessibility products retrieval (products now have accessibility tags)
run_test "S1" "I am a senior with limited grip strength" "products" ">=1" "Accessibility retrieves products"
run_test "S2" "Quiet blender for thin walled apartment" "products" ">=3" "Noise query retrieves products"
run_test "S4" "Budget is 300 dollars for a wedding gift" "products" ">=1" "Budget query retrieves products"

echo ""
echo "=== Generation Tests ==="
run_test "G1" "Best Vitamix for smoothies" "hero_exists" ">=1" "Hero block generated"
run_test "G2" "Best Vitamix for smoothies" "success" "true" "Generation completes successfully"
run_test "G3" "Best Vitamix for smoothies" "blockCount" ">=3" "Multiple blocks generated"

echo ""
echo "=========================================="
echo "  RESULTS SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [[ $FAILED -gt 0 ]]; then
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
