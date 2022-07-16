'use strict'

const createBtn = document.getElementById('create-btn');
const findBtn = document.getElementById('find-btn');
const exportBtn = document.getElementById('export-btn');
const downloadBtn = document.getElementById('download-btn');
const checkBtn = document.getElementById('check-btn');

const menuToggler = document.querySelector('.menu__toggler');
const inputFile = document.getElementById('input-file');
const urlInput = document.getElementById('input-url');

const apiKey = 'AIzaSyDlaaI4Y7-fklD-lscHes8jiC8tc7YnGOU';

async function getPlaylistItems(id) {
  
  const addDesc = document.getElementById('add-description').checked;
  const playlistItems = [];
  const itemsApi = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet%2CcontentDetails&maxResults=50&playlistId=${id}&key=${apiKey}`;

  const headers = ['ID', 'Title', 'Channel', 'PublishedAt']
  if(addDesc) headers.push('Description');
  playlistItems.push(headers);

  try {
    let response = await fetch(itemsApi);
    if(!response.ok) {
      throw response.status;
    }

    let result = await response.json();
    pushItems(result.items);

    while(result.nextPageToken) {
      // console.log('continue fetching...');
      response = await fetch(itemsApi + `&pageToken=${result.nextPageToken}`);
      result = await response.json();
      pushItems(result.items);
    }

    // console.log(playlistItems)
    return playlistItems;

  } catch(err) {
    if(err === 404) {
      urlInput.insertAdjacentHTML('afterend', createError('Playlist not found', 'Check the URL or playlist privacy settings - should be set to public or non-public'));
    } else {
      urlInput.insertAdjacentHTML('afterend', createError('Data retrieving problem.', 'Please try again later.'));
    }
  }

  function pushItems(items) {
    for(let item of items){

      const line = [
        item.snippet.resourceId.videoId,
        item.snippet.title,
        item.snippet.videoOwnerChannelTitle,
        item.contentDetails.videoPublishedAt.slice(0,10),
      ];
      if(addDesc) line.push(item.snippet.description);
  
      playlistItems.push(line);
    }
  }
}

async function getPlaylistInfo(id) {
  const playlistApi = `https://youtube.googleapis.com/youtube/v3/playlists?part=snippet%2CcontentDetails&id=${id}&key=${apiKey}`;

  const response = await fetch(playlistApi);
  let result = await response.json();
  if(!result.items.length) return;

  const playlistInfo = {
    id: result.items[0].id,
    title: result.items[0].snippet.title,
    author: result.items[0].snippet.channelTitle,
    videos: result.items[0].contentDetails.itemCount,
  }
    // console.log(playlistInfo)
  return playlistInfo;
}

async function getPlaylist() {
  const playlistId = urlInput.value.match(/(?<=[?&]list=).[^&]+(?=&|\b)/);

  const info = await getPlaylistInfo(playlistId);
  const items = await getPlaylistItems(playlistId);

  if(info && items) {
    const playlist = {
      info: info,
      items:items,
    }
    return playlist;
  }

}

createBtn.addEventListener('click', () => {

  showSection('create');
  findBtn.classList.remove('active');
  createBtn.classList.add('active');
  menuToggler.classList.remove('switched');

});

findBtn.addEventListener('click', () => {

  showSection('find');
  createBtn.classList.remove('active');
  findBtn.classList.add('active');
  menuToggler.classList.add('switched');

});

exportBtn.addEventListener('click', (e) => {
  e.preventDefault();
  clearError();

  if(!checkUrl(urlInput.value)) return;

  (async () => {
    const playlist = await getPlaylist();
    if(!playlist) return;
    console.log(playlist);

    const fileCSV = makeCSV(playlist);
    const fileUrl = URL.createObjectURL(fileCSV);
    // console.log(fileCSV);

    downloadBtn.addEventListener(
      'click', 
      downloadFile(downloadBtn, fileUrl, playlist.info.title)
    );

    showPlaylistInfo(playlist.info, fileCSV.size);
    showSection('export');
  })();
});

checkBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const file = inputFile.files[0];
  // console.log(file);
  let reader = new FileReader();
  reader.readAsText(file);

  reader.onload = function() {
    const text = reader.result;
    console.log(text);
    csvToArray(text);
  };

});

function csvToArray(text) {
  let data = text.split('\r\n');
  
  for(let i = 0; i < data.length ;i++) {
    data[i] = data[i].split(',');
    data[i] = data[i].map(value => value.replace(/""/g, '"'));
    data[i] = data[i].map(value => value.replace(/^"|"$/g, ''));

    // console.log(data[i]);
  }
  console.log(data);

}

function downloadFile(link, url, name) {
  const date = new Date().toISOString().slice(0, 10);

  link.setAttribute("href", url);
  link.setAttribute('download', `${name}-${date}`);
}

function makeCSV(playlist) {
  let csvFile = '';

  csvFile = playlist.items.map(row =>
    row
    .map(String)  // convert every value to String
    .map(v => v.replaceAll('"', '""'))  // escape double colons
    .map(v => `"${v}"`)  // quote it
    .join(',')  // comma-separated
  ).join('\r\n');  // rows starting on new lines

  csvFile += '\r\nPlaylist ID\r\n' + playlist.info.id;

  const blob = new Blob([csvFile], {type: 'text/csv;charset=utf-8;'});
  return blob;
}

function checkUrl(url) {
  const regex = /(https:\/\/)?(www\.)?(m.)?youtube\.com.*[?&]list=.*/;
  const result = regex.test(url);
  if(!result) {
    urlInput.insertAdjacentHTML('afterend', createError('Invalid URL'));
  }
  return result;
}

function createError(title, desc) {

  let errorElement = `
  <div class="error">
    <div class="error__title">
      <img src="icons/error.svg" alt="">
      <p>${title}</p>
    </div>
    ${desc ? `<p class="error__desc">${desc}</p>` : ``}
  </div>`;

  return errorElement;
}

function clearError() {
  const error = document.querySelector('.error');
  if(error) error.remove();
}

function showSection(sectionId) {
  const sections = [...document.querySelectorAll('.section')];

  sections
    .find(section => section.classList.contains('active'))
    .classList.remove('active')

  sections
    .find(section => section.id == sectionId)
    .classList.add('active');
}

function showPlaylistInfo(info, fileSize) {
  const title = document.querySelector('[data-label=title');
  const author = document.querySelector('[data-label=author');
  const videos = document.querySelector('[data-label=videos');
  const size = document.querySelector('[data-label=size');
  
  title.textContent = info.title;
  author.textContent = info.author;
  videos.textContent = info.videos;
  size.textContent = (fileSize / 1024).toFixed(1) + 'KB';
}

inputFile.addEventListener('change', (e) => {
  const fileLabel = document.querySelector('label[for=input-file]');

  const path = e.target.value.split('\\');
  const fileName = path[path.length-1];
  fileLabel.textContent = fileName;
});