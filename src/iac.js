const DEBUG = false;
var IAC_CODES = {
  IAC: 255, // interpret as command
  DONT: 254, // you are not to use option
  DO: 253, // please use option
  WONT: 252, // I won't use option
  WILL: 251, // I will use option
  SB: 250, // sub-negotiation
  GA: 249, // Go-ahead
  EL: 248, // Erase line
  EC: 247, // Erase character
  AYT: 246, // Are you there?
  AO: 245, // Abort output (but let prog finish)
  IP: 244, // Interrupt (permanently)
  BREAK: 243,
  DM: 242, // Data mark
  NOP: 241,
  SE: 240, // End sub-negotiation
  EOR: 239, // End of record (transparent mode)
  ABORT: 238, // Abort process
  SUSP: 237, // Suspend process
  EOF: 236, // End of file
  SYNCH: 242,
  OPT_BINARY: 0, // RFC 856
  OPT_ECHO: 1, // RFC 857
  OPT_SUPPRESS_GO_AHEAD: 3, // RFC 858
  OPT_STATUS: 5, // RFC 859
  OPT_TIMING_MARK: 6, // RFC 860
  OPT_TTYPE: 24, // RFC 930, 1091
  OPT_WINDOW_SIZE: 31, // RFC 1073
  OPT_LINE_MODE: 34, // RFC 1184
  OPT_NEW_ENVIRON: 39, // RFC 1572
};

var IAC_OPT_CODES = {
  NEW_ENV: {
    IS: 0,
    SEND: 1,
    INFO: 2,

    VAR: 0,
    VALUE: 1,
    ESC: 2,
    USERVAR: 3,
  },
  TTYPE: {
    IS: 0,
    SEND: 1
  }
};

var IAC_CODE_NAMES = {

};

for ([key, value] of Object.entries(IAC_CODES))
{
  IAC_CODE_NAMES[value] = key;
}
//console.log(IAC_CODE_NAMES)

function str_to_ascii(str)
{
  return str.split("").map(x => x.charCodeAt());
}

function telnet_command(code, ...args)
{
  args = args.flat();
  return [IAC_CODES.IAC, code].concat(args);
}

function parseENV(data)
{
  let ret = {};
  let type = 0;
  let state = 0;
  let index = 2;
  let var_data = [];
  let val_data = [];
  while (index < data.length)
  {
    let current = data[index];
    if (current < 4)
    {
      state = 0;
    }
    if (current >= 4 && state == 0)
    {
      state = 1;
    }
    if (current == 1)
    {
      index += 1;
      if (index >= data.length)
      {
        break;
      }
      current = data[index];
      state = 2;
    }
    switch (state)
    {
      case 0: //search var type
        if (var_data.length > 0)
        {
          ret[String.fromCharCode(...var_data)] = String.fromCharCode(...val_data);
        }
        var_data = [];
        val_data = [];
        type = current;
        break;
      case 1: //search var name
        var_data.push(current);
        break;
      case 2: //search var value
        val_data.push(current);
        break;
    }
    index++;
  }
  if (var_data.length > 0)
  {
    ret[String.fromCharCode(...var_data)] = String.fromCharCode(...val_data);
  }
  return ret;
}

function parseIAC(data)
{
  //returned IAC data
  let ret_data = {};
  ret_data.containsData = false;
  ret_data[IAC_CODE_NAMES[IAC_CODES.WILL]] = [];
  ret_data[IAC_CODE_NAMES[IAC_CODES.WONT]] = [];
  ret_data[IAC_CODE_NAMES[IAC_CODES.DO]] = [];
  ret_data[IAC_CODE_NAMES[IAC_CODES.DONT]] = [];
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
          ret_data.containsData = true;
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
            if (type && index + 1 < data.length)
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
            console.log("Unhandled " + current);
            if (!ret_data["unhandled"])
            {
              ret_data["unhandled"] = [];
            }
            ret_data["unhandled"].push(current);
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
          case IAC_CODES.OPT_NEW_ENVIRON: {
            let start_index = index;
            while (++index < data.length)
            {
              current = data[index];
              if (current == IAC_CODES.IAC)
              {
                index--;
                state = 0;
                break;
              }
            }
            ret_data.ENV = parseENV(data.slice(start_index, index + 1));
            break;
          }
          case IAC_CODES.OPT_TTYPE: {
            let start_index = index + 1;
            index = data.indexOf(IAC_CODES.IAC, start_index);
            if (data[start_index] == IAC_OPT_CODES.TTYPE.IS) 
            {
              ret_data.TTYPE = String.fromCharCode(...data.slice(start_index+1, index))
            }
            state = 0;
            break;
          }
        }
        state = 0;
        break;
    }
    index++;
  }
  if (ret_data.unhandled || DEBUG)
  {
    ret_data.data = data.toJSON().data;
    ret_data.string = data.toString();
    ret_data.ascii_string = String.fromCharCode(...data);
  }

  return ret_data;
}

module.exports = {IAC_CODES: IAC_CODES, IAC_CODE_NAMES: IAC_CODE_NAMES, IAC_OPT_CODES: IAC_OPT_CODES, parseIAC: parseIAC, telnet_command: telnet_command, str_to_ascii: str_to_ascii};
