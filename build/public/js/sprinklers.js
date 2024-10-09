var zoneList = {}

var wdayList = {
    0: {"name": "Sunday"},
    1: {"name": "Monday"},
    2: {"name": "Tuesday"},
    3: {"name": "Wednesday"},
    4: {"name": "Thursday"},
    5: {"name": "Friday"},
    6: {"name": "Saturday"},
};

var selectChoices = {
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
 
    $.ajax({
        type: "get",
        url:  "/api/getstations",
        }).done((data) => {
            zoneList = JSON.parse(data);
            selectChoices["zone"] = zoneList;
            showWaterNow();
        });
    setInterval(doRefresh, 10000);
});

function showPanel (id) {
    if (id == "schedule_list") {
        showSchedule();
    }
    if (id == "activity_log") {
        showActivity();
    }
}

function doRefresh () {
    var active = $( "#controls" ).tabs( "option", "active" );
    if (active == 2) {
        showActivity();
    }
}


var activeTimeout = 0;

function showActivity() {
     $.ajax({
         type: "get",
         url:  "/api/getqueue",
         }).done((data) => {
             obj = JSON.parse(data);
             if ("queue" in obj || "running" in obj) {
                t = $("<table>");
                tr = $("<tr>");
                tr.append("<th>Station</th>");
                tr.append("<th>Duration</th>");
                tr.append("<th>Resume</th>");
                t.append(tr)
                if ("running" in obj) {
                    tr = $("<tr>");
                    tr.append($("<td>").html(obj["running"][0]));
                    tr.append($("<td>").html(obj["running"][1]));
                    tr.append($("<td>").html(obj["running"][2]));
                    tr.append($("<td>").append($("<img src=images/x.svg>").on("click", doStop)));
                    tr.children().css("color", "green");
                    t.append(tr)
                }
                if ("queue" in obj) {
                    for (ix in obj["queue"]) {
                        line = obj["queue"][ix];
                        tr = $("<tr>");
                        tr.append($("<td>").html(line[0]));
                        tr.append($("<td>").html(line[1]));
                        tr.append($("<td>").html(line[2]));
                        t.append(tr)
                    }
                }
                $("#queue").html(t);
             } else {
                $("#queue").html("<b>idle</b>");
             }
         });
     $.ajax({
         type: "get",
         url:  "/api/getlog",
         }).done((data) => {
             $("#log").html(data);
         });
}

function doStart() {
     $(this).css("opacity", 0).animate({"opacity": 1});;
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
     $(this).css("opacity", 0).animate({"opacity": 1});;
     if (activeTimeout > 0) {
         clearTimeout (activeTimeout);
         activeTimeout = 0;
     }
     $("body").css("background-color", "white");
     $.ajax({
         type: "get",
         url:  "/api/stop",
         data: {"ts": Date.now()}
         }).done(showActivity);
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
     var keyList = Object.keys(zoneList).sort((a, b) => {return parseInt(a) - parseInt(b)});
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
    $(".editing").each(makeUneditable);
    $(this).css("opacity", 0).animate({"opacity": 1});;
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
                } else if ($(td).attr("class") == "skip") {
                    if ($(td).children("input").is(":checked")) {
                        array[$(td).data("index")] = 1;
                    } else {
                        array[$(td).data("index")] = 0;
                    }
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
            tr.append($("<th>").html("Skip"));
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
                    } else if (jx == 7) {
                        td.attr("class", "skip");
                        cb = $("<input type=checkbox>");
                        if (data[jx] > 0) {
                            cb.attr("checked", data[jx]);
                        }
                        td.append(cb);
                    } else {
                        td.html(data[jx]);
                    }
                    if (jx != 7) {
                        td.on("click", makeEditable);
                    }
                    tr.append(td);
                }
                tr.append($("<td>").attr("id", "saveCancel")
                                .append($('<img src="images/trash.svg">').on("click", deleteSchedule)))
                                .append($("<image src=images/check.svg>").on("click", () => {$(".editing").each(makeUneditable)}))
                                .append($("<image src=images/play.svg>").on("click", enqueueItem));
                t.append(tr);
            };
            t.append($("<tr>").append($("<td>").append($("<img src=images/plus.svg>").on("click", addSchedule))));
         });
}

function enqueueItem() {
    $(this).css("opacity", 0).animate({"opacity": 1});;
    var row = $(this).parent();
    var duration = 0;
    var zoneid = 0;
    row.children().each((id, element) => {
        if ($(element).data("index") == 6) {
            duration = $(element).data("value");
        }
        if ($(element).data("index") == 5) {
            zoneid = $(element).data("value");
        }
    });
    $.ajax({
         type: "get",
         url: "/api/enqueue",
         data: {"id": zoneid, "time": duration}
    });
}


function deleteSchedule() {
    var row = $(this).parent().parent();
    var id = row.attr("id");
    row.remove();
}

function addSchedule() {
    var tr = $("<tr>").attr("class", "dataLine");
    tr.append($("<td class=time>").html("-").data("value", "5:00 AM").data("index", "0").on("click", makeEditable));
    tr.append($("<td class=wday>").html("-").data("value", "1").data("index", "4").on("click", makeEditable));
    tr.append($("<td class=zone>").html("-").data("value", "").data("index", "5").on("click", makeEditable));
    tr.append($("<td>").html("1").data("value", "1").data("index", "6").on("click", makeEditable));
    tr.append($("<td>").html("<input type=checkbox>").data("value", "").data("index", "7").attr("class", "skip"));
    tr.append($("<td>").attr("id", "saveCancel")
                       .append($('<img src="images/trash.svg">').on("click", deleteSchedule)));
    $(this).parent().parent().before(tr);
}

function removeNewSchedule() {
    $(this).parent().parent().remove();
}

function makeEditable() {
    $(".editing").each(makeUneditable);
    $(this).off("click");
    $(this).on("keypress", keyPress);
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
    $(this).addClass("editing");
}

function keyPress(event) {
    if (event.which == 27) {
        $(".editing").each(makeUneditable);
    }
}

function makeUneditable() {
    $(this).on("click", makeEditable);
    $(this).off("keypress");
    var select = $(this).children("select");
    if (select.val()) {
        var value = select.val();
        $(this).removeClass("editing");
        var cellClass = $(this).attr("class");
        $(this).data("value", value);
        $(this).html(selectChoices[cellClass][value].name);
    } else {
        var text = $(this).children("input").val();
        $(this).data("value", text);
        $(this).html(text);
        $(this).removeClass("editing");
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
