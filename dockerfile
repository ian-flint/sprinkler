FROM python:3.6.9

WORKDIR /usr/src/app

RUN apt update
RUN apt install -y cron
RUN apt install -y systemd
RUN ln -sf /usr/share/zoneinfo/PST8PDT /etc/localtime

EXPOSE 8080/tcp

COPY ./build/ ./
RUN pip install --no-cache-dir -r requirements.txt

CMD [ "bash", "./start_sprinkler" ]
#CMD [ "bash" ]

