
.PHONY: bench

bench:
	deno run --allow-net --allow-read bench.ts warty-final-ubuntu.png

lint:
	deno lint --unstable *.ts
