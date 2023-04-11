
.PHONY: install
install:
	docker-compose run --rm --no-deps node sh -ci 'npm install'

.PHONY: start
start:
	docker-compose up -d

.PHONY: stop
stop:
	docker-compose stop

