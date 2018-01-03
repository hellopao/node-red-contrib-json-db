/**
 * Copyright 2014 Antoine Aflalo
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function (RED) {
    "use strict";
    var fs = require("fs");
    var path = require("path");
    var JsonDB = require("node-json-db");
    var defaultPath = path.join(RED.settings.userDir, "JsonDB");

    function JsonDBCollection(n) {
        RED.nodes.createNode(this, n);
        var collectionFilePath = path.join(defaultPath, n.collection + ".json");
        try {
            var oldFile = path.join(process.cwd(), "JsonDB_" + n.collection + ".json");
            var stats = fs.statSync(oldFile);
            try {
                stats = fs.statSync(defaultPath);
            }catch(error) {
                fs.mkdirSync(defaultPath);
            }
            
            fs.renameSync(oldFile, collectionFilePath);
            this.log("Moved old file from '" + oldFile + "' to '" + collectionFilePath + '"');
        } catch (error) {

        }
        this.db = new JsonDB(collectionFilePath, n.save);
        this.on("close", function () {
            try {
                this.db.save();
            } catch (error) {
            }
        });
    }

    RED.nodes.registerType("json-db-collection", JsonDBCollection);

    function DataIn(n) {
        RED.nodes.createNode(this, n);
        this.collection = RED.nodes.getNode(n.collection);
        this.topic = n.topic;
        this.override = !n.update;
        var node = this;

        this.on("input", function (msg) {
	    var topic = "";
	    if ( !msg.topic || msg.topic == "" ) 
	        topic = node.topic;
	    else
		topic = msg.topic;

	    try {
                node.collection.db.push(topic, msg.payload, node.override);
            } catch (error) {
                node.error(error);
            }
        });

    }

    RED.nodes.registerType("DataIn", DataIn);


    function DataOut(n) {
        RED.nodes.createNode(this, n);
        /**
         * @var JsonDB
         */
        this.collection = RED.nodes.getNode(n.collection);
        this.topic = n.topic;
        this.sendError = n.error;
        var node = this;

        this.on("input", function (msg) {
	    var topic = "";
	    if ( !msg.topic || msg.topic == "" )
		topic = node.topic;
	    else
	        topic = msg.topic;

            try {
                var data = node.collection.db.getData(topic);
                msg.payload = data;
                node.status({fill: "green", shape: "dot", text: "No Error"});
                node.send(msg);
            } catch (error) {
                if (node.sendError) {
                    msg.error = error.toString();
                    msg.topic = topic;
                    node.send(msg);
                    node.status({fill: "yellow", shape: "ring", text: error.toString()});
                } else {
                    node.error(error);
                    node.status({fill: "red", shape: "dot", text: error.toString()});
                }
            }
        });

    }

    RED.nodes.registerType("DataOut", DataOut);

}

