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

function saveSchedule() {
    var t = $(this).siblings("table");
    var output = "";
    t.children().each((ix, tr) => {
        var array = ["", "", "*", "*", "", "", ""];
        if ($(tr).attr("class") == "dataLine") {
            var zone = "";
            var day = "";
            $(tr).children().each((ix, td) => {
                if ($(td).data("index") == 0) {
                    fields = $(td).data("value").split(/[: ]/);
                    fields[0] = parseInt (fields[0]);
                    fields[1] = parseInt (fields[1]);
                    if (fields[0] == 12) {
                        fields[0] = 0;
                    }
                    if (fields[2] == 'PM') {
                        fields[0] += 12;
                    }
                    array[0] = fields[1];
                    array[1] = fields[0];
                } else {
                    array[$(td).data("index")] = $(td).data("value");
                }
                if (ix == 1) {
                    day = $(td).html();
                } else if (ix == 2) {
                    zone = $(td).html();
                }
            });
            output += "# " + zone + " on " + day + "\n";
            output += array.join(" ");
            output += "\n";
        }
    });
    $.ajax({
         type: "post",
         url: "/api/saveschedule",
         data: output
    }).done(() => {
         alert ("Schedule Saved");
         showSchedule();
    });
}

function showSchedule() {
     $.ajax({
         type: "get",
         url:  "/api/getschedule",
         }).done((json) => {
            obj = JSON.parse(json);
            $("#schedule_list").html("");
            $("#schedule_list")
                .append($("<image src=images/save.svg>").on("click", saveSchedule))
                .append($("<image src=images/rotate-ccw.svg>").on("click", showSchedule));
            $("#schedule_list").append($("<p>"));
            t = $("<table>");
            $("#schedule_list").append(t);
            tr = $("<tr>");
            tr.append($("<th>").html("Start Time"));
            tr.append($("<th>").html("Weekday"));
            tr.append($("<th>").html("Zone"));
            tr.append($("<th>").html("Duration"));
            t.append (tr);
            for (var ix in obj) {
                var data = obj[ix];
                tr = $("<tr>");
                tr.attr("class", "dataLine")
                hour = data[1];
                minute = data[0];
                ampm = "AM";
                if (hour == 0) {
                    hour = 12;
                } else if (hour == 12) {
                    ampm = "PM";
                } else if (hour > 12) {
                    hour -= 12;
                    ampm = "PM";
                }
                data[0] = hour + ":" + minute.padStart(2, "0") + " " + ampm;
                for (var jx in data) {
                    if ((jx == 1) || (jx == 2) || (jx == 3)) {
                        continue;
                    }
                    td = $("<td>");
                    td.data("value", (data[jx]));
                    td.data("index", jx);
                    if (jx == 0) {
                        td.attr("class", "time");
                        td.html(data[jx]);
                    } else if (jx == 4) {
                        td.attr("class", "wday");
                        td.html(wdayList[data[jx]].name);
                    } else if (jx == 5) {
                        td.attr("class", "zone");
                        td.html(zoneList[data[jx]].name);
                    } else {
                        td.html(data[jx]);
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
    var tr = $("<tr>").attr("class", "dataLine");
    tr.append($("<td>").html("0").data("value", "0").data("index", "0"));
    tr.append($("<td>").html("5").data("value", "5").data("index", "1"));
    tr.append($("<td class=wday>").html("1").data("value", "1").data("index", "4"));
    tr.append($("<td class=zone>").html("").data("value", "").data("index", "5"));
    tr.append($("<td>").html("10").data("value", "10").data("index", "6"));
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
    var value = $(this).data("value");
    var width = $(this).css("width");
    var cellClass = $(this).attr("class");
    $(this).html("");
    if (cellClass in selectChoices) {
        var listObj = selectChoices[cellClass];
        var select = $("<select>");
        var keyList = Object.keys(listObj).sort((a, b) => {return a - b});
        for (var ix in keyList) {
            var key = keyList[ix];
            var option = $("<option>").attr("value", key).text(key + ": " + listObj[key].name);
            if (key == value) {
                option.attr ("selected", true);
            }
            select.append(option);
        }
        $(this).append(select);
    } else if (cellClass == "time") {
        var i = $("<input type=text>").attr("value", text).css("width", width).timepicker({
            timeFormat: 'h:mm p',
            interval: 15,
            minTime: '4:00am',
            maxTime: '11:00pm',
            defaultTime: $(this).data("value"),
            startTime: '4:00am',
            dynamic: false,
            dropdown: true,
            scrollbar: true
        });
        $(this).append(i);
    } else {
        $(this).append($("<input type=text>").attr("value", text).css("width", width));
    }
}

function makeUneditable() {
    var cellClass = $(this).attr("class");
    if (cellClass in selectChoices) {
        var value = $(this).children("select").val();
        $(this).data("value", value);
        $(this).html(selectChoices[cellClass][value].name);
    } else {
        var text = $(this).children("input").val();
        $(this).data("value", text);
        $(this).html(text);
    }
}

function rollback() {
    var value = $(this).data("value");
    var cellClass = $(this).attr("class");
    if (cellClass in selectChoices) {
        $(this).html(selectChoices[cellClass][value].name);
    } else {
        $(this).html(value);
    }
}
