
var dialogueRoot;
var idCounter = 0;

var dialogueNodes = [];

var startpointOptions = {
    isSource:true,
    endpoint: ["Dot", {radius:7}],
    connector: ["Flowchart"],
    connectorStyle: {
        strokeStyle: "black",
        lineWidth: 3,
    }, paintStyle: {
        fillStyle:"black"
    }, maxConnections: 999999
};

var endpointOptions = Object.create(startpointOptions);

endpointOptions.isSource = false;
endpointOptions.isTarget = true;

function buildRecursiveAddToBody(dialogue) {
    var node = $("<div/>", {
        class: "dialogue-node",
        id: "dialogue-node-" + dialogue.id,
        style: "left: " + dialogue.x + "px; top: " + dialogue.y + "px",
    }).appendTo("#convo-editor");

    node.text(dialogue.text);
    node.dialogue = dialogue;

    jsPlumb.draggable(node, {
        stop: function(event, ui) {
            // Write to dialogue.
            node.dialogue.x = node.position().left;
            node.dialogue.y = node.position().top;
        }
    });

    setTimeout(function() {
        var startpoint = jsPlumb.addEndpoint(node, { anchor: "BottomCenter"}, startpointOptions);
        var endpoint = jsPlumb.addEndpoint(node, { anchor: "TopCenter"}, endpointOptions);

        node.startpoint = startpoint;
        node.endpoint = endpoint;

        $.each(dialogue.responses, function(key, value) {
            var child = buildRecursiveAddToBody(value);

            setTimeout(function() {
                jsPlumb.connect({source: startpoint, target: child.endpoint});
            }, 0);
        });
    });

    if(!dialogue.responses) {
        dialogue.responses = [];
    }

    dialogueNodes[node.attr("id")] = node;

    return node;
}


$(function() {
    // TODO Arrows?
    //
    // jsPlumb.Defaults.Overlays = [
    //     [ "Arrow", {
    //         location:1,
    //         id:"arrow",
    //         length:14,
    //         foldback:1.0
    //     } ],
    //     [ "Arrow", {
    //         location:2,
    //         id:"arrow-2",
    //         length:14,
    //         foldback:1.0
    //     } ],
    // ];
    $.getJSON("test-dialogue.json", function( data ) {
        dialogueRoot = data;

         $.each(dialogueRoot.dialogues, function(key, value) {
             buildRecursiveAddToBody(value);
         });
    });


    jsPlumb.bind("connection", function(info, originalEvent) {
        if(!originalEvent) return;

        var sourceNode = dialogueNodes[info.sourceId];
        var targetNode = dialogueNodes[info.targetId];

        var alreadyConnected = false;

        $.each(sourceNode.dialogue.responses, function(key, value) {
            if(value.id === info.targetId) {
                alreadyConnected = true;
                console.warn("Warning: Tried to connect " + info.sourceId + " to " + info.targetId + " but connection already exists.");
                return;
            }
        });

        if(!alreadyConnected) {
            sourceNode.dialogue.responses.push(targetNode.dialogue);
        }
    });

    // TODO Disconnection!

    $("#export-json").click(function() {
        $("<a />", {
            "download": "data.json",
            "href" : "data:application/json," + encodeURIComponent(JSON.stringify(dialogueRoot, null, 2))
        }).appendTo("body").click(function() {
             $(this).remove()
        })[0].click()
    });
});
