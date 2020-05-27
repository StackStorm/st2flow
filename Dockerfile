FROM node:10.15.3

# Create app directory
WORKDIR /opt/stackstorm/static/webui/st2flow

# get files
COPY . .

RUN cd /opt/stackstorm/static/webui && git clone https://github.com/StackStorm/st2web.git

# install dependencies
RUN npm install -g gulp-cli lerna yarn
RUN cd /opt/stackstorm/static/webui/st2web && lerna bootstrap
RUN ls /opt/stackstorm/static/webui/st2web


RUN cd /opt/stackstorm/static/webui/st2flow && lerna bootstrap
RUN ls /opt/stackstorm/static/webui/st2flow




# expose your ports
EXPOSE 3000

# start it up
CMD [ "gulp" ]
