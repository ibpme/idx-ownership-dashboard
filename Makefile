.PHONY: build-client build-server build run dev clean

build-client:
	cd client && yarn build

build-server:
	cd server && go build -o ../bin/server .

build: build-client build-server

run:
	./bin/server -client client/dist -db data/ownership.db

dev-server:
	cd server && go run . -addr :8080 -db ../data/ownership.db

dev-client:
	cd client && yarn dev

clean:
	rm -rf bin client/dist
