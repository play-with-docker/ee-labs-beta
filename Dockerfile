FROM golang:1.9

COPY . /go/src/github.com/franela/eetest

WORKDIR /go/src/github.com/franela/eetest

RUN go get -v -d ./...


RUN CGO_ENABLED=0 go build -a -installsuffix nocgo -o /go/bin/eetest .


FROM alpine

RUN apk --update add ca-certificates
RUN mkdir -p /app/pwd

COPY --from=0 /go/bin/eetest /app/eetest
COPY ./docs /app/docs

WORKDIR /app
CMD ["./eetest"]
