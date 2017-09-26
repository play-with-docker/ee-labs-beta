FROM golang:1.9 as api

COPY . /go/src/github.com/franela/eetest

WORKDIR /go/src/github.com/franela/eetest

RUN go get -v -d ./...


RUN CGO_ENABLED=0 go build -a -installsuffix nocgo -o /go/bin/eetest .


FROM node:boron as web

COPY package.json bower.json /app/

WORKDIR /app

RUN npm install 

RUN ./node_modules/bower/bin/bower --allow-root install

COPY . /app

RUN npm run build


FROM alpine

RUN apk --update add ca-certificates
RUN mkdir -p /app/pwd

COPY --from=api /go/bin/eetest /app/eetest
COPY --from=web /app/docs /app/docs

WORKDIR /app
CMD ["./eetest"]
