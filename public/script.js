// client-side js, loaded by index.html
// run by the browser each time the page is loaded

$(function() {
  console.log("hello world :o");
  var svg;
  $("#viewbox").svg({onLoad: (o) => svg = o});
  
  const socket = window.io();
  var sense = window.sense.init();
  //mabel tower bell sounds
  var soundurl = "https://cdn.glitch.com/73aed9e9-7ed2-40e5-93da-eb7538e8d42c%2F";
  //Vancouver tower sounds from method player?
  var bellurl = "https://cdn.glitch.com/0db7d9ca-f427-4a0a-8bb6-165118dc0eaf%2F";
  var colors = ["red", "orange", "gold", "green", "blue", "purple", "pink"];
  const stages = ["minimus", "minor", "major", "royal", "maximus"];
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = audioCtx.createGain();
  //name entered for this socket
  let name;
  let list = [];
  let entrants = [];
  let captain = false;
  let door = false;
  let numbells;
  let sounds = "tower";
  let trebleloc = "right";
  let bells;
  let mybells = [];
  let mbells = [];
  var rownum = 0;
  let speed = 2;
  let delay;
  let latency = 0;
  let phone = false;
  let phoneid;
  let phoneids = [];
  let phonebell;
  let phonestroke = 1;
  let playing = false;
  var place = 0;
  var nextBellTime = 0.0;
  var stroke = 1;
  var timeout;
  let lookahead = 25.0;
  let schedule = 0.1;
  var rowArr = [];
  var waiting = false;
  var myrow = 0;
  var moving = false;
  var queue = [];
  var waitgaps;
  var limitadvance;
  
  $("#container").on("click", 'input[type="text"]', () => {
    $("#resume").show();
  });
  
  $("#resume").on("click", () => {
    $("#resume").hide();
  });
  
  $(window).focus(() => {
    $("#resume").hide();
  });
  
  $(window).blur(() => {
    $("#resume").show();
  });
  
  
  $("#enterbutton").on("click", enter);
  $("input#secret").on("keyup", (e) => {
    if (e.code === "Enter") {
      enter(e);
    }
  });
  
  //assign a bell
  $("#entrants").on("change", "div.assign", function() {
    let n = $(this).prev("span").text();
    let arr = [];
    $(this).find("input:checked").each(function() {
      arr.push(Number($(this).val()));
    });
    
    socket.emit("assign", {name: n, bells: arr});
  });
  
  //display bell options on touchscreens
  $("#entrants").on("touchstart", "div.assign.active", function() {
    $(this).children("ul").toggleClass("block");
    $(this).parent("li").siblings("li").children("div.assign").toggleClass("hide");
  });
  
  //enter press in chat input
  $("input#chat").on("keyup", function(e) {
    if (e.code === "Enter" && $("input#chat").val().length) {
      socket.emit("chat", {name: name, message: $("input#chat").val()});
      $("input#chat").val("");
    }
  });
  
  //prevent typing in inputs from triggering a bell ring
  $("body").on("keyup", "input", function(e) {
    //e.preventDefault();
    e.stopPropagation();
  });
  
  
  
  
  //prevent arrow keys from scrolling
  $("body").on("keydown", function(e) {
    if ([38,40].includes(e.which)) {
        e.preventDefault();
        e.stopPropagation();
      }
  });
  
  
  //move bell with keyboard
  $("body").on("keyup", function(e) {
    
    if (door && mybells.length) {
      //console.log(mbells);
      let bell, motion;
      let codes = {arrowUp: 38, arrowDown: 40, arrowLeft: 37, arrowRight: 39}
      if (37 <= e.which && e.which <= 40) {
        bell = mbells[mbells.length-1] ;
        
        motion = e.which - 38;
        
        
      } else if ("asdw".includes(e.key) && mbells.length === 2) {
        bell = mbells[0];
        switch (e.key) {
          case "a":
            motion = -1;
            break;
          case "s":
            motion = 2;
            break;
          case "d":
            motion = 1;
            break;
          case "w":
            motion = 0;
            break;
        }
      }
      if (bell && (!limitadvance || motion === 0 || (limitadvance.ahead === "sounds" && bell.rownum-rownum < limitadvance.rows) || (limitadvance.ahead === "bells" && bell.rownum-Math.min(...bells.filter(b => b.num).map(b => b.rownum)) < limitadvance.rows) )) {
        //console.log("bell"+bell.num);
        //console.log(motion);
        let pl = bell.place;
        if ((bell.rownum === 0 && motion === 0) || (Math.abs(motion) === 1 && (pl + motion < 1 || pl + motion > numbells))) {
          motion = -2;
        }
        if (motion > -2) {
          socket.emit("motion", {bell: bell.num, motion: motion});
        }
      }
      
      
    }
  });
  
  //change speed
  $("#speed").change(function() {
    speed = Number($("#speed").val());
    socket.emit("speed", Number($("#speed").val()));
  });
  
  $("#waitforgaps").change(function() {
    socket.emit("waitgaps", $(this).prop("checked"));
  });
  
  $("#limitadvance input").change(function() {
    let sounds = $("#aheadsounds").prop("checked");
    let abells = $("#aheadbells").prop("checked");
    if (!sounds && !abells && limitadvance) {
      ["sounds","bells"].forEach(w => $("#ahead"+w).prop("disabled", false));
      socket.emit("limitadvance", false);
    } else if (sounds) {
      $("#aheadbells").prop("disabled", true);
      socket.emit("limitadvance", {rows: Number($("#rowlimit").val()), ahead: "sounds"});
    } else if (abells) {
      $("#aheadsounds").prop("disabled", true);
      socket.emit("limitadvance", {rows: Number($("#rowlimit").val()), ahead: "bells"});
    }
  });
  
  //change volume
  $("#volume").on("change", function(e) {
    gainNode.gain.value = this.value;
  });
  
  //change sounds
  $('input[name="sounds"]').on("change", function(e) {
    sounds = this.value;
    let current = bells.filter(b => b.type === sounds);
    for (let i = numbells; i > 0; i--) {
      let old = bells.find(b => b.num === i);
      current[numbells-i].num = i;
      current[numbells-i].stroke = old.stroke;
      delete old.num;
    }
  });
  
  
  
  $("#numbells li").on("click", function(e) {
    
      let n = Number($(this).text());
      socket.emit("stage", n);
    
  });
  
  //start or stop sound
  $("#start").on("click", function() {
    if (!playing) {
      socket.emit("start");
      
    } else {
      socket.emit("stop", rownum);
    }
    
  });
  
  //reset button clicked
  $("#reset").on("click", function() {
    if (!playing) {
      socket.emit("reset");
    }
  });
  
  
  
  
  
  
  //get list of names currently in use
  socket.on("names", (nn) => {
    list = nn;
  });
  
  //get bells
  socket.on("bells", arr => {
    bells = arr.map(b => {
      b.url = b.type === "tower" ? bellurl + b.url : b.type === "mabel" ? soundurl + b.url : b.url;
      return b;
    });
    setupSample(0);
  });
  
  
  
  
  
  socket.on("ping", () => {
    //console.log("ping sent");
    if (door) socket.emit("test", Date.now());
  });
  
  
  socket.on("pong", (n) => {
    if (door) {
        if (n > latency) {
        socket.emit("latency", {name: name, latency: n});
      }
      latency = n;
    }
  });
  
  socket.on("time", (n) => {
    //console.log(Date.now()-n);
  });
  
  socket.on("duplicate", () => {
    $("#name").val("");
    $("#name").attr("placeholder", '"'+name+'" already in use; pick another name');
  });
  
  
  //secret was wrong
  socket.on('wrong', () => {
    $("#secret").val("");
    $("#secret").attr("placeholder", "invalid secret");
  });
  
  //this socket enters
  socket.on("open", (obj) => {
    door = true;
    entrants = obj.entrants;
    numbells = obj.state.numbells;
    speed = obj.state.speed;
    $("#speed").val(speed);
    delay = speed/numbells;
    waitgaps = obj.state.waitgaps;
    $("#waitforgaps").prop("checked", waitgaps);
    limitadvance = obj.state.limitadvance;
    updatelimit();
    updatelist(entrants);
    stagechange(obj.state);
    if (entrants.find(o => o.name === name).conductor) {
      captain = true;
      
    }
    $(".conduct").show();
    
     
    $("#resume").hide();
    $("#enter").hide();
    $("#container").show();
  });
  
 socket.on("speed", (s) => {
    speed = s;
    delay = s/numbells;
    $("#speed").val(s);
  });
  
  socket.on("waitgaps", (t) => {
    waitgaps = t;
  });
  
  socket.on("limitadvance", (o) => {
    console.log(o);
    limitadvance = o;
    updatelimit();
  });
  
  //this phone socket assigned
  socket.on("phoneassign", (obj) => {
    console.log(obj);
    if (obj.bellname && door) {
      phonebell = obj.bellnum;
      $("#phoneinfo .bellname").remove();
      $("#phoneinfo").append(`<h3 class="bellname">Bell ${obj.bellnum}</h3>`);
      sense.fling({off: true}, phonering);
      sense.fling({interval: 300, sensitivity: 0.8}, phonering);
    } else if (door) {
      phonebell = null;
      $("#phoneinfo .bellname").remove();
      sense.fling({off: true}, phonering);
    }
    
    function phonering(data) {
      console.log(data);
      socket.emit("ring", {bell: obj.bellnum, stroke: phonestroke}); 
    }
  });
  
  //someone else enters
  socket.on("entrance", (m) => {
    if (door) {
      updateentrant(m.info, true);
    }
    
  });
  
  socket.on("exit", (m) => {
    if (door) {
      updateentrant(m, false);
    }
  });
  
  
  
  
  socket.on("disconnect", (r) => {
    console.log(r);
    //if (r === 'io server disconnect') {
      door = false;
      captain = false;
      $("#container").hide();
      $("#enter").hide();
      $("#phoneinfo").hide();
      $("#closed").show();
    //}
    
  });
  
  
  
  
  
  socket.on("stagechange", stagechange);
  
  //any socket is assigned
  socket.on("assignment", (obj) => {
    //console.log(bells);
    
    
    updateentrant(obj);
    if (obj.name === name) {
      assign(obj);
      
    }
  });
  
  //bell motion received
  socket.on("motion", obj => {
    if (door) {
      
      let belll = bells.find(o => o.num === obj.bell);
      
      belll.queue.push([]);
      let q = belll.queue.length-1;
      console.log(q);
      let pchange;
      let pathnew;
        
      let i = rowArr.length-1;
      while (!rowArr[i].some(a => a.includes(obj.bell)) && i > -1) { //find the last row to include this bell
        i--;
      }
      console.log("i = "+i);
      let p = rowArr[i].findIndex(a => a.includes(obj.bell)); //place of bell in most recent row (0-indexed)
      let x = 184 - (numbells/2 - p - 1)*32;
      let y = (i+1)*20;
      let pathchange = obj.motion === 0 ? 20 : Math.hypot(20,32);
      if (!belll.moving) {
        belll.path = $("#path"+obj.bell).attr("d");
        belll.l = Number($("#path"+obj.bell).attr("stroke-dasharray"));
      }
      let path = belll.path;
      let l = belll.l;
      
      
      
      if (obj.time === -1) {
        let j = rowArr[i][p].indexOf(obj.bell);
        rowArr[i][p].splice(j, 1);
        
        belll.queue[q].push({id: "#path"+obj.bell, animate: {svgStrokeDashOffset: pathchange}, setpath: true, pchange: l - pathchange, pnew: path.slice(0, path.lastIndexOf(" "))});
        belll.l -= pathchange;
        belll.path = path.slice(0, path.lastIndexOf(" "));
      } else {
        if (i === rowArr.length-1) {
          rowArr.push([]);
          for (let n = 0; n < numbells; n++) {
            rowArr[rowArr.length-1].push([]);
          }
        }
        if (i >= rowArr.length-1) {
          console.log("somehow i is invalid");
        } else if (p+obj.motion < 0 || p+obj.motion > numbells) {
          console.log("somehow this motion is invalid");
        } else {
          rowArr[i+1][p+obj.motion] = rowArr[i+1][p+obj.motion].concat([obj.bell]);
          belll.queue[q].push({id: "#path"+obj.bell, attr: {"stroke-dashoffset": pathchange, "stroke-dasharray": l+pathchange, d: path+" l"+(obj.motion*32)+","+20}}, {id: "#path"+obj.bell, animate: {svgStrokeDashOffset: 0}});
          belll.l += pathchange;
          belll.path += " l"+(obj.motion*32)+",20";
        }
        
      }
        
      belll.queue[q].push({id: "#rope"+obj.bell, animate: {svgCx: x + obj.motion*32, svgCy: y + obj.time*20}}, {id: "#rope"+obj.bell +" + text", animate: {svgX: x-5 + obj.motion*32, svgY: y+5 + obj.time*20}});
      
      anim(true);
      
      if (mybells.includes(obj.bell)) {
        let bell = mbells.find(o => o.num === obj.bell);
        bell.place += obj.motion;
        bell.rownum += obj.time;
        if (Math.max(...mbells.map(b => b.rownum)) !== myrow) {
          myrow = bell.rownum;
          
            let viewy = myrow > 14 ? (myrow-14)*20 : "0";
            queue.push({svgViewBox: "0 "+viewy+" 400 400"});
            anim(false);
          
        }
      }
      
      function setpath() {
        $("#path"+obj.bell).attr({d: pathnew, "stroke-dasharray": pchange, "stroke-dashoffset": 0});
        endmove();
      }
      
      if (waiting) {
        waiting = false;
        nextBellTime = audioCtx.currentTime;
        scheduler();
      }
      
      
      function endmove() {
        let b = belll;
        if (b.moving) {
          b.moved++;
          if (b.moved === b.total) {
            b.moving = false;
            anim(true);
          }
          
        } 
      }
      
      function viewmove() {
        if (moving) {
          moving = false;
          anim(false);
        }
      }
      
      function anim(o) {
        if (o && !belll.moving && belll.queue[0] && belll.queue[0].length) {
          //console.log(belll.queue[0]);
          belll.total = 0;
          belll.moved = 0;
          belll.moving = true;
          belll.queue.shift().forEach(a => {
            if (a.attr) {
              $(a.id).attr(a.attr);
            } else if (a.setpath) {
              belll.total++;
              pchange = a.pchange;
              pathnew = a.pnew;
              $(a.id).animate(a.animate, 300, setpath);
            } else {
              belll.total++;
              $(a.id).animate(a.animate, 300, endmove);
            }
          });
        }
        if (!o && !moving && queue.length) {
          let a = queue.shift();
          moving = true;
          $("#viewbox").animate(a, 300, viewmove);
        }
      }
    }
  });
  
  
  
  //start playing
  socket.on("start", () => {
    playing = true;
    if (door) {
      $("#start").text("Stop");
      console.log(rowArr);
      console.log(rownum);
      //play(currentrow, 0);
      nextBellTime = audioCtx.currentTime;
      scheduler();
    }
  });
  
  socket.on("stop", () => {
    clearTimeout(timeout);
    $("#playing").hide(); //need to update this stuff
    $("#start").text("Start");
    playing = false;
    waiting = false;
  });
  
  socket.on("reset", (o) => {
    $("#viewbox").attr("viewBox", "0 0 400 400");
    stagechange(o);
  });
  
  
  //chat message arrives
  socket.on("chat", obj => {
    let message = obj.name+": "+obj.message+ "\n";
    document.querySelector("textarea").value += message;
  });
  
  
  // BEGIN FUNCTIONS
  
  //attempt to enter the chamber
  function enter(e) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    requestDeviceMotion();
    name = $("#name").val();
    let secret = $("#secret").val();
    if (name.length && !/^\s+$/.test(name) && secret.length && !/^[^\w]+$/.test(secret)) {
      socket.emit("entrant", {name: name, secret: secret});

    } else {
      $("#name").val("");
      $("#secret").val("");
      $("#name").attr("placeholder", "invalid name or wrong secret");
    }
    
  }
  
  
  function updatelimit() {
    if (limitadvance) {
      $("#rowlimit").val(limitadvance.rows);
      let arr = ["sounds","bells"];
      for (let i = 0; i < arr.length; i++) {
        let w = arr[i];
        let other = arr[1-i];
        if (limitadvance.ahead === w) {
          $("#ahead"+w).prop({checked: true, disabled: false});
          $("#ahead"+other).prop({checked: false, disabled: true});
        }
      }
    } else {
      $("#aheadsounds,#aheadbells").prop({checked: false, disabled: false});
    }
    
      
  }
  
 
  
  //build list of entrants
  function updatelist(m) {
    $("#entrants li").remove();
    m.forEach((e) => {
      if (e.name === name && e.conductor) {
        captain = true;
        
      }
      $("#numbells li:hover").css("cursor", "pointer");
      let c = e.conductor ? " (C)" : "";
      let d = captain || e.name === name ? ' active"' : '"';
      let b = e.bells.length ? e.bells.join(",") : "no bells";
      $("#entrants").append('<li id="'+e.name+'"><span>'+e.name+ '</span>' + c+'<div class="assign'+ d+ '><span class="summary">'+b+'</span>' + selectOpts(name, e.bells) +'</div></li>');
    });
  }
  
  //build bell selection dropdown, n is an array of bell numbers assigned to the person
  function selectOpts(name, n) {
    let opts = `
      <ul class="dropdown">
      `;
    for (let i = 1; i <= numbells; i++) {
      let s = n.includes(i) ? " checked " : "";
      opts += `<li><input type="checkbox" id="${name+"-"+i}" value="${i}"${s} /><label for="${name+"-"+i}">${i}</label></li>
`
    }
    opts += `</ul>`;
    return opts;
  }
  
  function updateentrant(o, isnew) {
    if (isnew) {
      entrants.push(o);
      let c = o.conductor ? " (C)" : "";
      let d = captain || o.name === name ? ' active"' : '"';
      $("#entrants").append('<li id="'+o.name+'"><span>'+o.name+ '</span>' + c+'<div class="assign'+ d+ '><span class="summary">no bells</span>' + selectOpts(name, o.bells) +'</div></li>');
      
    } else {
      let li = $("li#"+o.name);
      let j = entrants.findIndex(e => e.name === o.name);
      if (o.exit) {
        li.remove();
        entrants.splice(j, 1);
      } else {
        let text = o.bells.length ? o.bells.join(",") : "no bells";
        li.find("span.summary").text(text);
        entrants[j].bells = o.bells;
        for (let i = 1; i <= numbells; i++) {
          if (o.bells.length === 2) {
            $("input#"+o.name+"-"+i).prop("disabled", !o.bells.includes(i));
          } else {
            $("input#"+o.name+"-"+i).prop("disabled", false);
          }
          
          $("input#"+o.name+"-"+i).prop("checked", o.bells.includes(i));
          $("#rope"+i).attr("fill", entrants.some(e => e.bells.includes(i)) ? colors[(i-1)%colors.length] : "white");
        }
        
      }
    
    }
  }
  
  
  
  //what it says on the tin
  function stagechange(o) {
    
    numbells = o.numbells;
    rowArr = o.rows;
    rownum = o.rownum;
    place = 0;
    stroke = rownum%2 === 0 ? 1 : -1;
    //remove things
    $("#display div").remove();
    $("#bellgroup").contents().remove();
    $(".assign ul.dropdown").remove();
    bells.forEach(b => delete b.num);
    
    //adjust bells array
    let current = bells.filter(b => b.type === sounds);
    
    for (let i = 0; i < numbells; i++) {
      let j = numbells-1-i;
      let num = i+1;
      current[j].num = num;
      current[j].place = num;
      current[j].queue = [];
      addbell(current[j]);
    }
    
    //stage indicator
    $("#numbells li").css({color: "black", "background-color": "white"});
    let stage = stages[(numbells-4)/2];
    $("li#"+stage).css({color: "white", "background-color": "black"});
    
    //update entrants
    for (let i = 0; i < entrants.length; i++) {
      entrants[i].bells = entrants[i].bells.filter(b => b <= numbells);
      $("li#"+entrants[i].name+ " > div.assign").append(selectOpts(entrants[i].name, entrants[i].bells));
      updateentrant(entrants[i]);
      if (entrants[i].name === name) {
        assign(entrants[i]);
      }
    }
    
    if (rowArr.length > 1) {
      catchup(rowArr);
    }
      //console.log(rowArr);
    
  }
  
  function catchup(arr) {
    for (let i = 1; i <= numbells; i++) {
      let row = 1;
      let oldp = i-1;
      let l = 0;
      let path = $("#path"+i).attr("d");
      while (arr[row] && arr[row].some(a => a.includes(i))) {
        let p = arr[row].findIndex(a => a.includes(i));
        let motion = p-oldp;
        let change = motion === 0 ? 20 : Math.hypot(20,32);
        l += change;
        path += " l"+(motion*32)+",20";
        oldp = p;
        row++;
      }
      bells.find(b => b.num === i).place = oldp+1;
      if (mybells.includes(i)) {
        let bell = mbells.find(b => b.num === i);
        bell.place = oldp+1;
        bell.rownum = row-1;
        if (row-1 > myrow) myrow = row-1;
      }
      $("#path"+i).attr({d: path, "stroke-dasharray": l});
      let x = 184 - (numbells/2 - oldp-1)*32;
      $("#rope"+i).attr({cx: x, cy: row*20});
      $("#rope"+i+" + text").attr({x: x-5, y: row*20+5});
    }
    if (myrow > 14) {
      $("#viewbox").attr("viewBox", "0 "+(myrow-14)*20+ " 400 400");
    }
  }
  
  
  //assign a bell to me
  function assign(me) {
    
    if (me && me.bells) {
      //console.log(me.bells);
      //remove buttons
      $("#display2").contents().remove();
      //remove anything from my old arrays of bells not in the new array
      mybells.forEach(b => {
        let i = mbells.findIndex(m => m.num === b);
        if (!me.bells.includes(b)) {
          $('.phone option[value="'+b+'"]').remove();
          $('label[for="bell'+b+'"]').parent("li").remove();
          mbells.splice(i, 1);
        }
      });
      mybells = mybells.filter(b => me.bells.includes(b));
      
      //add whatever's needed
      me.bells.forEach(b => {
        let bell = bells.find(be => be.num === b);
        
        
        let mbell = mbells.find(mb => mb.num === b);
        if (mbell) {
          mbell.name = bell.bell;
          mbell.rownum = 0;
          mbell.place = mbell.num;
        }
        if (!mybells.includes(b)) {
          
          //console.log(bell);
          
          $(".phone select").append(`<option value="${b}">${b}</option>`);
          
          mbells.push({num: b, name: bell.bell, place: bell.place, rownum: 0});
          mybells.push(b);
        }
      });
      
      mbells.sort((a,b) => {b.num-a.num});
      if (mybells.length) {
        let keys = [{val: "-1", border: "right", loc: "left", letter: "a"},{val: "0", border: "bottom", loc: "top", letter: "w"},{val: "1", border: "left", loc: "right", letter: "d"},{val: "2", border: "top", loc: "bottom", letter: "s"}];
        let div = ``;
        let other = ``;
        keys.forEach(o => {
          let margin = o.loc === "left" ? "margin-left:9px;" : o.loc === "top" ? "margin-top:5px;" : "";
          div += `<div class="key ${o.loc} val${o.val}" ><div class="arrow" style="border-${o.border}:10px solid black;${margin}"></div></div>`;
          other += `<div class="key ${o.loc} val${o.val}"><p class="key">${o.letter}</p></div>`;
        });
        let html = `<div id="keys`+mybells.join(`" class="keycontainer">${other}</div><div id="keys`)+`" class="keycontainer">${div}</div>`;
        $("#display2").append(html);
      }
    }
    
  }
  
  async function getFile(audioContext, filepath) {
    const response = await fetch(filepath);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  }
  
  //create sound buffers for all the bells
  async function setupSample(i) {
    let arrayBuffer = await getFile(audioCtx, bells[i].url);
    audioCtx.decodeAudioData(arrayBuffer, (buffer) => {
      bells[i].buffer = buffer;
      if (i < bells.length-1) {
        i++;
        setupSample(i);
      } else {
        console.log("finished setting up");
      }
    }, (e) => { console.log(e) });
  }
  
  
  function nextPlace() {
    nextBellTime += delay;
    
    place++;
    if (place === numbells) {
      if (stroke === -1) nextBellTime += delay; //add handstroke gap
      place = 0;
      stroke *= -1;
      rownum++;
    }
    
  }
  
  function scheduleRing(p, t) {
    let num = rowArr[rownum][p];
    let bell = num && num.length ? bells.find(b => b.num === num[0]) : null;
    
    if (!num.length && waitgaps) {
      console.log("no num");
      
      waiting = true;
    } else {
      nextPlace();
    }
    
    if (bell) {
      let pan = -p/(numbells-1) + 0.5;
      playSample(audioCtx, bell.buffer, t);
    }
    
  }
  
  function scheduler() {
    
    while (nextBellTime < audioCtx.currentTime + schedule && rowArr[rownum] && !waiting) {
      scheduleRing(place, nextBellTime);
    }
    !waiting ? timeout = setTimeout(scheduler, lookahead): clearTimeout(timeout);
    
  }
  
  
  //play sound
  function playSample(audioContext, audioBuffer, t) {
    //console.log("playSample called");
    //console.log(audioBuffer);
    const sampleSource = audioContext.createBufferSource();
    sampleSource.buffer = audioBuffer;
    sampleSource.connect(gainNode).connect(audioContext.destination)
    //sampleSource.connect(audioContext.destination);
    sampleSource.start(t);
    return sampleSource;
  }
  
  
  
  //taken from https://developer.apple.com/forums/thread/128376
  function requestDeviceMotion () {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {

        }
      })
      .catch(console.error);
    } else {
    // handle regular non iOS 13+ devices
    console.log ("not iOS");
    }
  }
  
  
  function addbell(bell) {
    let x = 184 - (numbells/2 - bell.num)*32;
    let color = colors[(bell.num-1)%colors.length];
    svg.circle($("#bellgroup"), x, 20, 5, {fill: color});
    svg.path($("#bellgroup"), "M"+x+",20", {"stroke-width": 2, stroke: color, id: "path"+bell.num, "stroke-dasharray": 0, fill: "none"});
    svg.circle($("#bellgroup"), x, 20, 10, {"stroke-width": 2, stroke: color, fill: "white", id: "rope"+bell.num});
    svg.text($("#bellgroup"), x-5, 25, bell.num.toString());
  }
  
  //add a bell
  
  
  
});



