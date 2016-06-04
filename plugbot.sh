#!/bin/bash
#
# chkconfig: 345 80 20
# description: NodeJS Plugbot
# processname: plugbot
# pidfile: /var/run/plugbot.pid
# logfile: /var/log/nodejs/plugbot.log
#
### BEGIN INIT INFO
# Provides:          plugbot
# Required-Start:    $remote_fs $syslog networking
# Required-Stop:     $remote_fs $syslog networking
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: NodeJS PlugBot Daemon
# Description:       Starts/Stops/Restarts/Get Status of the NodeJS PlugBot Daemon
#                    placed in /etc/init.d.
### END INIT INFO

# Author : Talos - http://private-ts.tk

# Source function library.
. /lib/lsb/init-functions

# PARAMETERS, REPLACE XXXXX WITH YOUR OWNS
NAME=plugbot	                    	 # Unique name for the application
NODE_ENV=production                  	 # Node environment
INSTANCE_DIR=/usr/lib/nodejs/$NAME	 	 # Location of the application source
SOURCE_NAME=bot.js               		 # Name os the application entry point script
ROOM_NAME=#xxxxxxx						 # Name of the plug.dj room
ACCOUNT_NAME=#xxxxxx@xxxx.xxxx			 # Account mail for bot
ACCOUNT_PSWD=#xxxxxxx					 # Account password for bot

user=nodejs
pidfile=/var/run/$NAME.pid
logfile=/var/log/nodejs/$NAME.log
forever_dir=/var/run/forever         	# Forever root directory.

node=node
forever=forever
awk=awk
sed=sed

start() {
    echo "Starting $NAME node instance: "

    if [ "$id" = "" ]; then
        # Create the log and pid files, making sure that the target use has access to them
        touch $logfile
        chown $user $logfile

        touch $pidfile
        chown $user $pidfile

        # Launch the application
        start_daemon
            $forever start --pidFile $pidfile -l $logfile -a --sourceDir $INSTANCE_DIR $SOURCE_NAME $ROOM_NAME $ACCOUNT_NAME $ACCOUNT_PSWD
			echo "Instance started"
        RETVAL=$?
    else
        echo "Instance already running"
        RETVAL=0
    fi
}

restart() {
    echo -n "Restarting $NAME node instance : "
    if [ "$id" != "" ]; then
        $forever restart $id
		echo "Instance restarted"
        RETVAL=$?
    else
        start
    fi
}

stop() {
    echo -n "Shutting down $NAME node instance : "
    if [ "$id" != "" ]; then
        $forever stop $id
    else
        echo "Instance is not running";
    fi
    RETVAL=$?
}

getForeverId() {
    ps -eo pid,command | grep "$INSTANCE_DIR/$SOURCE_NAME" | grep -v grep | awk "{print \$1;}"
} 
id=$(getForeverId)

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
	status)
        status_of_proc -p $pidfile
        ;;
    restart)
        restart
        ;;
	id)
		echo $id
		;;
    *)
        echo "Usage:  {start|stop|status|restart}"
        exit 1
        ;;
esac
exit $RETVAL