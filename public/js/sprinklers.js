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

wdayList = {
    0: {"name": "Sunday"},
    1: {"name": "Monday"},
    2: {"name": "Tuesday"},
    3: {"name": "Wednesday"},
    4: {"name": "Thursday"},
    5: {"name": "Friday"},
    6: {"name": "Saturday"},
};

selectChoices = {
    "zone": zoneList,
    "wday": wdayList,
}

$(document).ready(()=>{
   $("#controls").tabs({
                    activate: (event, ui) => {
                        showPanel (ui.newPanel.attr("id"));
                        },
                    create: (event, ui) => {
                        showPanel (ui.panel.attr("id"));
                        },
                   });
   showWaterNow();
});

function showPanel (id) {
    if (id == "schedule_list") {
        showSchedule();
    }
}


var activeTimeout = 0;

function doStart() {
     var id = $(this).parent().parent().attr("id");
     var time = $(this).val();
     if (time == "") {
         time = 1;
     }
     if (activeTimeout > 0) {
         clearTimeout (activeTimeout);
         activeTimeout = 0;
     }
     $("body").css("background-color", "lightgreen");
     $.ajax({
         type: "get",
         url:  "/api/runone",
         data: {"id": id, "time": time, "ts": Date.now()}
         })
     activeTimeout = setTimeout(()=>{
         $("body").css("background-color", "white");
         activeTimeout = 0;
     }, time * 60 * 1000);
}
function doStop() {
     if (activeTimeout > 0) {
         clearTimeout (activeTimeout);
         activeTimeout = 0;
     }
     $("body").css("background-color", "white");
     $.ajax({
         type: "get",
         url:  "/api/stop",
         data: {"ts": Date.now()}
         });
}

function showWaterNow() {
     $("#sprinkler_list").html("");
     $("#sprinkler_list").append($("<input type=submit class=stop value=Stop/Next></input> "));
     $("#sprinkler_list").append($("<p>"));
     t = $("<table>");
     $("#sprinkler_list").append(t);
     tr = $("<tr>");
     tr.append($("<th>").html("Zone"));
     t.append (tr);
     var keyList = Object.keys(zoneList).sort((a, b) => {return a - b});
     for (var ix in keyList) {
        var key = keyList[ix];
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
        tr.append(td);
        t.append(tr);
     };
     t.append ($("<tr><td class=toptd></td></tr>"));
     $(".start").off("click");
     $(".stop").off("click");
     $(".start").on("click", doStart);
     $(".stop").on("click", doStop);
}

function showSchedule() {
     $.ajax({
         type: "get",
         url:  "/api/getschedule",
         }).done((json) => {
            obj = JSON.parse(json);
            $("#schedule_list").html("");
            $("#schedule_list").append($("<p>"));
            t = $("<table>");
            $("#schedule_list").append(t);
            tr = $("<tr>");
            tr.append($("<th>").html("Min"));
            tr.append($("<th>").html("Hour"));
            tr.append($("<th>").html("Weekday"));
            tr.append($("<th>").html("Zone"));
            tr.append($("<th>").html("Time"));
            t.append (tr);
            for (var ix in obj) {
                var data = obj[ix];
                tr = $("<tr>");
                for (var jx in data) {
                    if ((jx == 2) || (jx == 3)) {
                        continue;
                    }
                    td = $("<td>").append(data[jx]);
                    if (jx == 4) {
                        td.attr("class", "wday");
                    }
                    if (jx == 5) {
                        td.attr("class", "zone");
                    }
                    tr.append(td);
                }
                tr.append($("<td>").attr("id", "saveCancel")
                                .append($('<img src="images/edit.svg">').on("click", editSchedule)));
                t.append(tr);
            };
            t.append($("<tr>").append($("<td>").append($("<img src=images/plus.svg>").on("click", addSchedule))));
         });
}

function editSchedule() {
    var cell = $(this).parent();
    cell.parent().children(":not(#saveCancel)").each(makeEditable);
    cell.html("")
        .append($('<img src="images/check.svg">').on("click", updateSchedule))
        .append($('<img src="images/x.svg">').on("click", uneditSchedule))
        .append($('<img src="images/trash.svg">').on("click", deleteSchedule));
}

function updateSchedule() {
    var obj = {};
    var cell = $(this).parent();
    cell.html("")
            .append($('<img src="images/edit.svg">').on("click", editSchedule));
    cell.siblings(":not(#last_seen)").each(makeUneditable).each((index, item)=>{
        obj[$(item).attr("id")] = $(item).html();
    });
}

function uneditSchedule() {
    var cell = $(this).parent();
    cell.html("")
            .append($('<img src="images/edit.svg">').on("click", editSchedule));
    cell.siblings(":not(#last_seen)").each(rollback);
}

function deleteSchedule() {
    var row = $(this).parent().parent();
    var id = row.attr("id");
    row.remove();
}

function addSchedule() {
    var tr = $("<tr>");
    tr.append($("<td>").html("0"));
    tr.append($("<td>").html("5"));
    tr.append($("<td>").html("*"));
    tr.append($("<td class=month>").html("*"));
    tr.append($("<td class=wday>").html("1"));
    tr.append($("<td class=zone>").html(""));
    tr.append($("<td>").html("10"));
    tr.append($("<td>").attr("id", "saveCancel")
          .append($('<img src="images/edit.svg">').on("click", editSchedule)));
    $(this).parent().parent().before(tr);
    tr.children(":not(#saveCancel)").each(makeEditable)
    tr.children("#saveCancel").html("")
        .append($('<img src="images/check.svg">').on("click", updateSchedule))
        .append($('<img src="images/x.svg">').on("click", removeNewSchedule))
}

function removeNewSchedule() {
    $(this).parent().parent().remove();
}

function makeEditable() {
    var text = $(this).html();
    var width = $(this).css("width");
    $(this).html("").data("originalText", text);
    var cellClass = $(this).attr("class");
    if (cellClass in selectChoices) {
        var listObj = selectChoices[cellClass];
        var select = $("<select>");
        var keyList = Object.keys(listObj).sort((a, b) => {return a - b});
        for (var ix in keyList) {
            var key = keyList[ix];
            var option = $("<option>").attr("value", key).text(key + ": " + listObj[key].name);
            if (key == text) {
                option.attr ("selected", true);
            }
            select.append(option);
        }
        $(this).append(select);
    } else {
        $(this).append($("<input type=text>").attr("value", text).css("width", width));
    }
}

function makeUneditable() {
    var cellClass = $(this).attr("class");
    if (cellClass in selectChoices) {
        var text = $(this).children("select").val();
        $(this).html(text);
    } else {
        var text = $(this).children("input").val();
        $(this).html(text);
    }
}

function rollback() {
    var text = $(this).data("originalText");
    $(this).html(text);
}
