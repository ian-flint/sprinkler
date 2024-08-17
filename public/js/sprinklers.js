zoneList = {
    1: {"name": "Garden Box Bubblers"},
    2: {"name": "Left Rear Garden Box"},
    3: {"name": "Rear Right Idle (red)"},
    4: {"name": "Rear Right Veg and Berm"},
    5: {"name": "Rear Right Side (black)"},
    6: {"name": "Left Far Planter Drip"},
    7: {"name": "Rear Near Spray"},
    8: {"name": "Rear Rose Garden"},
    9: {"name": "Left Redwood Sprays"},
    10: {"name": "Rear Far Sprays"},
    11: {"name": "Hillside Trees (green)"},
    12: {"name": "Rear Right Redwoods (blue)"},
    13: {"name": "Hose"},
    14: {"name": "Unused"},
    15: {"name": "Unused"},
    16: {"name": "Front Spray by House"},
    17: {"name": "Front Right Spray"},
    18: {"name": "Front Parkway Spray"},
    19: {"name": "Front Fence Spray"},
    20: {"name": "Front Yard Left Drip"},
    21: {"name": "Front Yard Right Drip"},
    22: {"name": "Driveway Edge Spray"},
    23: {"name": "Unused"},
    24: {"name": "Unused"},
};
$(document).ready(()=>{
     buildList();
     $(".start").click(doStart);
     $(".stop").click(doStop);
});

function doStart() {
     var id = $(this).parent().parent().attr("id");
     var time = $(this).val();
     if (time == "") {
         time = 1;
     }
     $.ajax({
         type: "get",
         url:  "/api/runone",
         data: {"id": id, "time": time}
         });
}
function doStop() {
     $.ajax({
         type: "get",
         url:  "/api/stop",
         });
}

function buildList () {
     $("#sprinkler_list").html("");
     $("#sprinkler_list").append($("<p>"));
     t = $("<table>");
     $("#sprinkler_list").append(t);
     tr = $("<tr>");
     tr.append($("<th>").html("Zone"));
     t.append (tr);
     var keylist = Object.keys(zoneList).sort((a, b) => {return a - b});
     for (var ix in keylist) {
        var key = keylist[ix];
        tr = $("<tr>");
        tr.append($("<td class=toptd>").html(key + ": " + zoneList[key].name));
        t.append (tr);
        tr = $("<tr>");
        tr.attr ("id", key);
        td = $("<td>");
        td.append($("<input type=submit class=start value=1></input> "));
        td.append($("<input type=submit class=start value=5></input> "));
        td.append($("<input type=submit class=start value=10></input> "));
        td.append($("<input type=submit class=start value=30></input> "));
        td.append($("<input type=submit class=stop value=Stop></input> "));
        tr.append(td);
        t.append(tr);
     };
     t.append ($("<tr><td class=toptd></td></tr>"));
}

function showPanel (id) {
    if (id == "meshes") {
        showMeshes();
    } else {
        showNodes();
    }
}

