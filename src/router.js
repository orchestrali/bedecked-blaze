const bells = require('./bells.js');
let entrants = [];
let numbells = 6;
var state = {
  numbells: 6,
  speed: 2, //row duration in seconds
  chat: "",
  bells: [],
  playing: false,
  rows: [],
  rownum: 0,
  waitgaps: false,
  limitadvance: false
};

module.exports = function router(io) {
  setstate("tower");
  
  //console.log("router function");
  io.on("connection", (socket) => {
    console.log("connection");
    //console.log(socket.id);
    //send current names to prevent duplicates
    socket.emit('names', entrants.map(e => e.name));
    socket.emit('bells', bells);
    
    
    
    socket.on('latency', (obj) => {
      console.log(obj);
      //socket.disconnect(true);
    });
    
    socket.on('getstate', () => {
      socket.emit("state", state);
    });
    
    //socket.use((packet, next) => {
    //  console.log(packet[0]);
    //  next();
    //});
    
    socket.on('test', (n) => {
      //console.log(Date.now()-n);
      socket.emit('time', Date.now());
    });
    
    //a socket attempts to enter
    socket.on("entrant", (obj) => {
      console.log("entrant");
      if ([process.env.SECRET, process.env.CAPTAIN].includes(obj.secret)) {
        //add person to list, send list, send socket the current stage
        if (entrants.map(e => e.name).includes(obj.name)) {
          socket.emit("duplicate", "");
        } else {
          let o = {name: obj.name, id: socket.id, conductor: obj.secret === process.env.CAPTAIN, bells: [], phones: []};
          entrants.push(o);
          socket.emit("open", {entrants: entrants, state: state});
          socket.broadcast.emit("entrance", {info: o});
        }
        
      } else if (obj.secret === process.env.PHONE && entrants.find(o => o.name === obj.name)) {
        console.log("phone connected");
        let ringer = entrants.find(o => o.name === obj.name);
        ringer.phones.push(socket.id);
        io.to(ringer.id).emit("phone", {id: socket.id});
        socket.emit("phoneopen", entrants);
        
      } else {
        socket.emit("wrong", "");
      }
      
    });
    
    //a socket disconnects
    socket.on("disconnect", () => {
      console.log("user disconnected");
      let i = entrants.findIndex(e => e.id === socket.id);
      if (i > -1) {
        console.log(entrants[i].name);
        entrants[i].phones.forEach(p => {
          io.to(p).emit("phoneclose", "parent disconnected :-(");
        });
        io.emit("exit", {name: entrants[i].name, exit: true});
        entrants.splice(i, 1);
      } else if (entrants.find(e => e.phones.includes(socket.id))) {
        let ringer = entrants.find(e => e.phones.includes(socket.id));
        let j = ringer.phones.indexOf(socket.id);
        ringer.phones.splice(j, 1);
        io.to(ringer.id).emit("closephone", socket.id);
      }
      if (entrants.length === 0) {
        state.chat = "";
        setstate("tower");
      }
    });
    
    socket.on("assign", (obj) => {
      console.log("assign");
      console.log(obj);
      let ringer = entrants.find(r => r.name === obj.name);
      for (let i = 0; i < numbells; i++) {
        let j = state.bells[i].ringers.indexOf(obj.name);
        if (j > -1 && !obj.bells.includes(state.bells[i].num)) {
          state.bells[i].ringers.splice(j, 1);
        } else if (j === -1 && obj.bells.includes(state.bells[i].num)) {
          state.bells[i].ringers.push(obj.name);
        }
      }
      if (ringer) {
        ringer.bells = obj.bells;
      } else {
        console.log(obj);
      }
      io.emit("assignment", obj);
    });
    
    
    
    socket.on("motion", (obj) => {
      console.log(obj);
      let i = 1;
      let last = state.rows[state.rows.length-i].findIndex(a => a.includes(obj.bell));
      while (last === -1 && i < state.rows.length) {
        i++;
        last = state.rows[state.rows.length-i].findIndex(a => a.includes(obj.bell));
      }
      
      if (last > -1) {
        let p = last;
        last = state.rows.length-i;
        if (obj.motion === 0) {
          let oldp = state.rows[last-1].findIndex(a => a.includes(obj.bell));
          let j = state.rows[last][p].indexOf(obj.bell);
          state.rows[last][p].splice(j, 1);
          obj.time = -1;
          obj.motion = oldp - p;
        } else {
          console.log(last);
          if (obj.motion === 2) obj.motion = 0;
          obj.time = 1;
          if (i === 1) {
            state.rows.push([]);
            for (let j = 0; j < numbells; j++) {
              state.rows[state.rows.length-1].push([]);
            }
          }
          if (state.rows[last+1] && state.rows[last+1][p+obj.motion]) {
            state.rows[last+1][p+obj.motion] = state.rows[last+1][p+obj.motion].concat([obj.bell]);
          }
          
        }
        io.emit("motion", obj);
      }
    });
    
    socket.on("start", () => {
      state.playing = true;
      io.emit("start");
    });
    
    socket.on("stop", (num) => {
      state.playing = false;
      state.rownum = num;
      io.emit("stop", state);
    });
    
    socket.on("reset", () => {
      setstate();
      io.emit("reset", state);
    });
    
    
    socket.on("chat", (obj) => {
      console.log("chat");
      state.chat += obj.name+": "+obj.message+ "\n";
      io.emit("chat", obj);
    });
    
    socket.on("stage", (n) => {
      numbells = n;
      state.numbells = n;
      setstate("tower");
      io.emit("stagechange", state);
    });
    
    socket.on("speed", (n) => {
      console.log("speed change "+n);
      io.emit("speed", n);
    });
    
    socket.on("waitgaps", t => {
      state.waitgaps = t;
      io.emit("waitgaps", t);
    });
    
    socket.on("limitadvance", (o) => {
      console.log("limit advance");
      state.limitadvance = o;
      io.emit("limitadvance", o);
    });
    
  });
  
}

function setstate(type) {
  let nstate = [];
  state.rows = [];
  let row = [];
  for (let i = 1; i <= numbells; i++) {
    let bell = {
      num: i,
      //note: bells.filter(b => b.type === type)[i].bell,
      //stroke: 1,
      ringers: [],
      place: i
    };
    
    row.push([i]);
    let oldbell = state.bells.find(b => b.num === i);
    if (oldbell && entrants.length) bell.ringers = oldbell.ringers.filter(r => entrants.some(o => o.name === r));
    nstate.push(bell);
  }
  state.rows.push(row);
  state.bells = nstate;
  state.rownum = 0;
}