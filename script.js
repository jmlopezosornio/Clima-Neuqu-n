'use strict';

const zone = 'America/Argentina/Buenos_Aires';
const apiUrl = 'https://api.open-meteo.com/v1/forecast?latitude=-38.9516&longitude=-68.0591&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FArgentina%2FBuenos_Aires&forecast_days=1&timeformat=unixtime';

function mapWeatherCode(code){
  const descriptions={
    0:'Despejado',1:'Mayormente despejado',2:'Parcialmente nublado',3:'Nublado',45:'Niebla',48:'Niebla con escarcha',
    51:'Llovizna ligera',53:'Llovizna',55:'Llovizna intensa',56:'Llovizna helada',57:'Llovizna helada intensa',
    61:'Lluvia ligera',63:'Lluvia',65:'Lluvia intensa',66:'Lluvia helada',67:'Lluvia helada intensa',
    71:'Nieve ligera',73:'Nieve',75:'Nieve intensa',77:'Granos de nieve',80:'Chaparrones',81:'Chaparrones moderados',82:'Chaparrones intensos',
    85:'Chubascos de nieve',86:'Chubascos de nieve intensos',95:'Tormenta',96:'Tormenta con granizo',99:'Tormenta con granizo intenso'
  };

  let theme='nublado';
  let icon='☁️';
  if([0,1].includes(code)){theme='soleado';icon='☀️';}
  else if(code===2){theme='nublado';icon='🌤️';}
  else if(code===3){theme='nublado';icon='☁️';}
  else if([45,48].includes(code)){theme='niebla';icon='🌫️';}
  else if([71,73,75,77,85,86].includes(code)){theme='nieve';icon='❄️';}
  else if([95,96,99].includes(code)){theme='tormenta';icon='⛈️';}
  else if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)){theme='lluvia';icon='🌧️';}

  return {theme,icon,desc:descriptions[code] || 'Estado no disponible'};
}

const put=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
const number=(v,suffix='')=>Number.isFinite(v)?Math.round(v)+suffix:'--'+suffix;
let lastTime=null;

function render(data){
  const c=data.current;
  if(!c || !Number.isFinite(c.temperature_2m) || !Number.isFinite(c.time)) throw Error('Datos incompletos');

  const w=mapWeatherCode(c.weather_code);
  document.body.dataset.theme=w.theme;
  document.body.dataset.night=String(c.is_day===0);
  put('weather-icon',w.icon);
  put('main-temp',number(c.temperature_2m));
  put('weather-desc',w.desc);
  put('comfort-humidity',number(c.relative_humidity_2m,'%'));
  put('comfort-feels-like',number(c.apparent_temperature,'°C'));
  put('comfort-wind',number(c.wind_speed_10m,' km/h'));
  put('temp-range',`Mín. ${number(data.daily?.temperature_2m_min?.[0],'°')} · Máx. ${number(data.daily?.temperature_2m_max?.[0],'°')}`);

  lastTime=c.time;
  updateStatus();
}

function updateStatus(failed=false){
  const box=document.getElementById('connection');
  if(!box) return;
  let msg='';
  if(failed) msg=lastTime?'Sin conexión · mostrando último dato':'No se pudo consultar el clima';
  else if(lastTime && Date.now()/1000-lastTime>3600) msg='Datos pendientes de actualización';
  box.textContent=msg;
  box.classList.toggle('show',Boolean(msg));
}

async function getWeather(){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(apiUrl,{signal:controller.signal,cache:'no-store'});
    if(!response.ok) throw Error('HTTP '+response.status);
    const data=await response.json();
    render(data);
    try{localStorage.setItem('neuquen-weather-v1',JSON.stringify(data));}catch{}
  }catch(error){
    updateStatus(true);
    if(!lastTime) put('weather-desc','Clima no disponible');
    console.warn('No se pudo actualizar el clima:',error.message);
  }finally{
    clearTimeout(timer);
  }
}

try{
  const stored=JSON.parse(localStorage.getItem('neuquen-weather-v1'));
  if(stored?.current) render(stored);
}catch{}

getWeather();
setInterval(getWeather,10*60*1000);
window.addEventListener('online',getWeather);
