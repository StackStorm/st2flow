const ACTIONS = [{
  pack: 'core',
  ref: 'core.http',
  description: 'Action that performs an http request.'
}, {
  pack: 'core',
  ref: 'core.local',
  description: 'Action that executes an arbitrary Linux command on the localhost.'
}, {
  pack: 'core',
  ref: 'core.local_sudo',
  description: 'Action that executes an arbitrary Linux command on the localhost.'
}, {
  pack: 'core',
  ref: 'core.remote',
  description: 'Action to execute arbitrary linux command remotely.'
}, {
  pack: 'core',
  ref: 'core.remote_sudo',
  description: 'Action to execute arbitrary linux command remotely.'
}, {
  pack: 'core',
  ref: 'core.sendmail',
  description: 'This sends an email'
}, {
  pack: 'linux',
  ref: 'linux.check_loadavg',
  description: 'Check CPU Load Average on a Host'
}, {
  pack: 'linux',
  ref: 'linux.check_processes',
  description: 'Check Interesting Processes'
}, {
  pack: 'linux',
  ref: 'linux.cp',
  description: 'Copy file(s)'
}, {
  pack: 'linux',
  ref: 'linux.diag_loadavg',
  description: 'Diagnostic workflow for high load alert'
}, {
  pack: 'linux',
  ref: 'linux.dig',
  description: 'Dig action'
}, {
  pack: 'linux',
  ref: 'linux.file_touch',
  description: 'Touches a file'
}, {
  pack: 'linux',
  ref: 'linux.get_open_ports',
  description: 'Retrieve open ports for a given host'
}, {
  pack: 'linux',
  ref: 'linux.lsof',
  description: 'Run lsof'
}, {
  pack: 'linux',
  ref: 'linux.lsof_pids',
  description: 'Run lsof for a group of PIDs'
}, {
  pack: 'linux',
  ref: 'linux.mv',
  description: 'Move file(s)'
}, {
  pack: 'linux',
  ref: 'linux.netstat',
  description: 'Run netstat'
}, {
  pack: 'linux',
  ref: 'linux.netstat_grep',
  description: 'Grep netstat results'
}, {
  pack: 'linux',
  ref: 'linux.pkill',
  description: 'Kill processes using pkill'
}, {
  pack: 'linux',
  ref: 'linux.rm',
  description: 'Remove file(s)'
}, {
  pack: 'linux',
  ref: 'linux.rsync',
  description: 'Copy file(s) from one place to another w/ rsync'
}, {
  pack: 'linux',
  ref: 'linux.scp',
  description: 'Secure copy file(s)'
}, {
  pack: 'linux',
  ref: 'linux.service',
  description: 'Stops, Starts, or Restarts a service'
}, {
  pack: 'linux',
  ref: 'linux.traceroute',
  description: 'Traceroute a Host'
}, {
  pack: 'linux',
  ref: 'linux.vmstat',
  description: 'Run vmstat'
}, {
  pack: 'linux',
  ref: 'linux.wait_for_ssh',
  description: 'Wait for SSH'
}];

export default ACTIONS;
