(function(){
  var h=document.getElementById('name'),t='Your\nName';
  t.split('').forEach(function(c){
    if(c==='\n'){h.appendChild(document.createElement('br'));return}
    var s=document.createElement('span');s.textContent=c;h.appendChild(s);
  });
  var kinds=[['web','#ffb3e1'],['games','#7dffc4'],['hardware','#ffe14d']],i=0,
      scr=document.getElementById('screen'),tag=document.getElementById('tag');
  function go(d){i=(i+d+3)%3;scr.style.background=kinds[i][1];tag.textContent=kinds[i][0]}
  document.getElementById('a').onclick=function(){go(1)};
  document.getElementById('b').onclick=function(){go(-1)};
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var d=document.getElementById('device');
  addEventListener('pointermove',function(e){
    var x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;
    d.style.transform='rotateY('+(x*16)+'deg) rotateX('+(-y*12)+'deg)';
  });
})();