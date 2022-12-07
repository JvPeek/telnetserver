const DEBUG = false
var IAC_CODES = {
  IAC     : 255, // interpret as command
  DONT    : 254, // you are not to use option
  DO      : 253, // please use option
  WONT    : 252, // I won't use option
  WILL    : 251, // I will use option
  SB      : 250, // sub-negotiation
  GA      : 249, // Go-ahead
  EL      : 248, // Erase line
  EC      : 247, // Erase character
  AYT     : 246, // Are you there?
  AO      : 245, // Abort output (but let prog finish)
  IP      : 244, // Interrupt (permanently)
  BREAK   : 243,
  DM      : 242, // Data mark
  NOP     : 241,
  SE      : 240, // End sub-negotiation
  EOR     : 239, // End of record (transparent mode)
  ABORT   : 238, // Abort process
  SUSP    : 237, // Suspend process
  EOF     : 236, // End of file
  SYNCH   : 242,
  OPT_BINARY            : 0, // RFC 856
  OPT_ECHO              : 1, // RFC 857
  OPT_SUPPRESS_GO_AHEAD : 3, // RFC 858
  OPT_STATUS            : 5, // RFC 859
  OPT_TIMING_MARK       : 6, // RFC 860
  OPT_TTYPE             : 24, // RFC 930, 1091
  OPT_WINDOW_SIZE       : 31, // RFC 1073
  OPT_LINE_MODE         : 34, // RFC 1184
  OPT_NEW_ENVIRON       : 39, // RFC 1572
}

var IAC_CODE_NAMES = {

}

for([key, value] of Object.entries(IAC_CODES)) {
  IAC_CODE_NAMES[value] = key
}
console.log(IAC_CODE_NAMES)


function parseIAC(data)
{
  //returned IAC data
  let ret_data = {};
  let index = 0;
  let state = 0;
  while (index < data.length)
  {
    let current = data[index];
    switch (state)
    {
      case 0: //wating for IAC start code
        if (current == IAC_CODES.IAC)
        {
          state = 1;
        }
        break;
      case 1: //parsing IAC code
        switch (current)
        {
          case IAC_CODES.WILL:
          case IAC_CODES.WONT:
          case IAC_CODES.DO:
          case IAC_CODES.DONT:
            let type = IAC_CODE_NAMES[current];
            if (type && !ret_data[type])
            {
              ret_data[type] = [];
            }
            if (type && index+1 < data.length)
            {
              ret_data[type].push(data[++index]);
            }
            state = 0;
            break;
          case IAC_CODES.SB: //enter subnegotiation type
            state = 2;
            break;
          case IAC_CODES.SE: //sub negogation ended, wait for IAC
            state = 0;
            break;
          default: //unhandled we just wait for a new IAC
          console.log("Unhandled " + current)
          if (!ret_data["unhandled"]) {
            ret_data["unhandled"] = []
          }
          ret_data["unhandled"].push(current)
            state = 0;
        }
        break;
      case 2: //parsing sub negotiation
        switch (current)
        {
          case IAC_CODES.OPT_WINDOW_SIZE:
            if (index + 4 >= data.length)
            {
              //error not enough data to parse window size
              index = data.length;
              break;
            }
            else
            {
              width = (data[index + 1] << 8) + data[index + 2];
              height = (data[index + 3] << 8) + data[index + 4];
              ret_data.window_size = {width: width, height: height};
              index += 4;
            }
            break;
          //case IAC_CODES.OPT_TTYPE:
          //  state = 4;
          //  break;
        }
        state = 0;
        break;
      case 4: //handling term type
        break;
    }
    index++;
  }
  if(ret_data.unhandled || DEBUG) {
    ret_data.data = data.toJSON().data
  }

  return ret_data;
}

module.exports = {IAC_CODES: IAC_CODES, parseIAC: parseIAC}
