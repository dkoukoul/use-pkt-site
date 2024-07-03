// Toggle the dropdown content for How to use section
document.querySelectorAll('.toggle-header').forEach(header => {
    header.addEventListener('click', () => {
        const content = header.nextElementSibling;
        content.classList.toggle('open');
        const arrow = header.querySelector('.arrow');
        if (content.classList.contains('open')) {
            arrow.style.display = 'none';
        } else {
            arrow.style.display = 'inline-block';
        }
    });
});


function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 2000);
}

function selectText(nodeId) {
    const node = document.getElementById(nodeId);

    if (document.body.createTextRange) {
        const range = document.body.createTextRange();
        range.moveToElementText(node);
        range.select();
    } else if (window.getSelection) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        console.warn("Could not select text in node: Unsupported browser.");
    }
}

function updateButtons(serverName) {
    const getAddressButton = document.getElementById('get-address');
    const getCredentialsButton = document.getElementById('get-credentials');
    if (serverName === '') {
        getAddressButton.innerHTML = 'Request Address';
        getCredentialsButton.innerHTML = 'Get Credentials';
        getAddressButton.disabled = true;
        getCredentialsButton.disabled = true;
        return;
    }
    getAddressButton.innerHTML = 'Request Address from ' + serverName;
    getCredentialsButton.innerHTML = 'Get Credentials from ' + serverName;
    getAddressButton.disabled = false;
    getCredentialsButton.disabled = false;
}

function createVpnServerList() {
    fetch('/api/vpn-servers')
    .then(response => response.json())
    .then(servers => {
        const vpnList = document.getElementById('vpn-list');
        servers.forEach(server => {
            const div = document.createElement('div');
            const getAddressButton = document.getElementById('get-address');
            div.className = 'server-item';
            div.dataset.url = server.url;
            div.dataset.cost = server.cost;
            div.innerHTML = `<div class="top-row"><img src="assets/images/flags/${server.country}.svg"><span>${server.name}</span></div>`;
            div.addEventListener('click', function() {
                if(this.classList.contains('selected')) {
                    this.classList.remove('selected');
                    getAddressButton.disabled = true;
                    updateButtons('');
                    return;
                } else {
                    vpnList.querySelectorAll('.server-item').forEach(i => i.classList.remove('selected'));
                    this.classList.add('selected');
                    getAddressButton.disabled = false;
                    showNotification('Click Request Address button to get a new PKT address for payment.');
                    updateButtons(server.name);
                }
            });

            vpnList.appendChild(div);
        });
    });
}

function showFiles(message) {
    const regex = /\/vpnclients\/\w+\.\w+/g;
    const selectedItem = document.querySelector('.server-item.selected');
    const linkUrl = selectedItem ? new URL(selectedItem.getAttribute('data-url')).origin : '';
    const files = message.match(regex);
    console.log(files);
    const filesDiv = document.getElementById('files');

    files.forEach(file => {
        const fileName = file.split('/').pop();
        const fileLink = document.createElement('a');
        const fileImg = document.createElement('img');
        fileImg.src = 'assets/icons/vpnkey.svg';
        fileLink.textContent = fileName;
        if (fileName.endsWith('.mobileconfig')) {
            const iosIcon = document.createElement('img');
            iosIcon.src = 'assets/icons/ios-logo.png';
            fileLink.appendChild(iosIcon);
        
            const macosIcon = document.createElement('img');
            macosIcon.src = 'assets/icons/MacOS_logo.png';
            fileLink.appendChild(macosIcon);
        } else if (fileName.endsWith('.ovpn')) {
            const windowsIcon = document.createElement('img');
            windowsIcon.src = 'assets/icons/windows-logo.svg'; 
            fileLink.appendChild(windowsIcon);
        } else if (fileName.endsWith('.sswan')) {
            const androidIcon = document.createElement('img');
            androidIcon.src = 'assets/icons/android-logo.png';
            fileLink.appendChild(androidIcon);
        } else if (fileName.endsWith('.p12')) {
            const linuxIcon = document.createElement('img');
            linuxIcon.src = 'assets/icons/linux-logo.png'; 
            fileLink.appendChild(linuxIcon);
        }
        fileLink.href = linkUrl+file;
        fileLink.download = fileName;
        fileLink.classList.add('file-item');
        fileLink.appendChild(fileImg);
        filesDiv.appendChild(fileLink);
    });
}

function getCredentials() {
    const selectedItem = document.querySelector('.server-item.selected');
    const serverName = selectedItem ? selectedItem.querySelector('span').textContent : '';
    const pktAddress = document.getElementById('pktaddress').textContent;
    const filesDiv = document.getElementById('files');
    filesDiv.innerHTML = '';

    fetch(`/api/get-credentials?serverName=${serverName}&address=${pktAddress}`)
        .then(response => response.json())
        .then(data => {
            try {
                let jsonData = JSON.parse(data);
                if (jsonData.status === "success") {
                    document.getElementById('response').textContent = "";
                    showFiles(jsonData.message);
                } else {
                    document.getElementById('response').textContent = jsonData.message || JSON.stringify(jsonData);
                }
            } catch (error) {
                console.error("Parsing error:", error);
                document.getElementById('response').textContent = JSON.stringify(data);
            }
        })
        .catch(error => {
            console.error("Fetch error:", error);
            document.getElementById('response').textContent = "Network or fetch error occurred.";
        });
}

function getAddress() {
    const selectedItem = document.querySelector('.server-item.selected');
    const serverName = selectedItem ? selectedItem.querySelector('span').textContent : '';
    fetch(`/api/get-address?serverName=${serverName}`)
        .then(response => response.json())
        .then(data => {
            let jsonData = JSON.parse(data);
            console.log(jsonData.status);
            console.log(jsonData);
            if (jsonData.address !== "") {
                pktAddressDiv = document.getElementById('pktaddress');
                pktAddressDiv.textContent = jsonData.address;
                document.getElementById('get-credentials').hidden = false;
                document.getElementById('payInfo').hidden = false;
            } else {
                document.getElementById('response').textContent = data;
                document.getElementById('payInfo').hidden = true;
            }
        });
}

window.onload = function() {
    createVpnServerList();
};