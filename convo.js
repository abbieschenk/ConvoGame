
var dialogueRoot;
var idCounter = 0;

function buildRecursiveAddToBody(dialogue) {
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
    
    var node = $("<div/>", {
        class: "dialogue-node",
        id: "dialogue-node-" + dialogue.id,
        style: "left: " + dialogue.x + "px; top: " + dialogue.y + "px",
    }).appendTo("#convo-editor");
    
    node.text(dialogue.text);
    
    jsPlumb.draggable(node, {
        stop: function(event, ui) {
            // Write to dialogue.
            dialogue.x = node.position().left;
            dialogue.y = node.position().top;
        }
    });
    
    setTimeout(function() {
        var startpoint = jsPlumb.addEndpoint(node, { anchor: "BottomCenter"}, startpointOptions);
    
        $.each(dialogue.responses, function(key, value) {
            var child = buildRecursiveAddToBody(value);

            setTimeout(function() {
                var endpoint = jsPlumb.addEndpoint(child, { anchor: "TopCenter"}, endpointOptions);
                jsPlumb.connect({source: startpoint, target: endpoint});
            }, 0);
        });
    });
    
    return node;
}


$(function() {
    $.getJSON("test-dialogue.json", function( data ) {
        dialogueRoot = data;
        
         $.each(dialogueRoot.dialogues, function(key, value) {
             buildRecursiveAddToBody(value);
         }); 
    });
    
    $("#export-json").click(function() {
//        var dialogueExport = {
//            dialogues: dialogueRoot
//        };
//        
        $("<a />", {
            "download": "data.json",
            "href" : "data:application/json," + encodeURIComponent(JSON.stringify(dialogueRoot, null, 2))
        }).appendTo("body").click(function() {
             $(this).remove()
        })[0].click()
    });
});