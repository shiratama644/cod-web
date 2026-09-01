# Makefile — CodWeb 権威サーバー UDP 実証ビルド
# 依存: g++ / make のみ（cmake・OpenSSL ヘッダ不要）。サンドボックスで直接ビルド可能。

CXX      ?= g++
CXXFLAGS ?= -std=c++17 -O2 -Wall -Wextra -pedantic
LDFLAGS  ?=

BIN_DIR  := bin
SRC      := server.cpp client.cpp
BINS     := $(BIN_DIR)/wt_server $(BIN_DIR)/wt_client

.PHONY: all build clean run-server run-client-alice run-client-bob

all: build

build: $(BINS)

$(BIN_DIR):
	mkdir -p $(BIN_DIR)

$(BIN_DIR)/wt_server: server.cpp protocol.h | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) server.cpp -o $@ $(LDFLAGS)

$(BIN_DIR)/wt_client: client.cpp protocol.h | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) client.cpp -o $@ $(LDFLAGS)

# ---- 実行例 ----
# サーバー:
run-server: build
	./$(BIN_DIR)/wt_server

# クライアント例（対話: WASD 移動 / SPACE 射撃 / Q 退室）:
run-client-alice: build
	./$(BIN_DIR)/wt_client --name Alice --port 9000 --id 1 --team 0

# デモ（自動移動、2 台同時に安全）:
run-client-alice-demo: build
	./$(BIN_DIR)/wt_client --name Alice --port 9000 --id 1 --demo

run-client-bob-demo: build
	./$(BIN_DIR)/wt_client --name Bob   --port 9000 --id 2 --demo

clean:
	rm -rf $(BIN_DIR)
