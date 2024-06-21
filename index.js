const getCredentialsButton = document.getElementById('get-credentials');
const transactionId = document.getElementById('transaction-id');

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
// Enable/disable the get credentials button based on the length of the transaction ID
transactionId.addEventListener('input', function() {
    const vpnList = document.getElementById('vpn-list');
    const selectedServerItem = vpnList.querySelector('.server-item.selected');
    console.log(this.value.length);
    if (this.value.length === 64 && selectedServerItem) {
        console.log("Enabling button");
        getCredentialsButton.disabled = false;
    } else {
        getCredentialsButton.disabled = true;
    }
});

document.getElementById('get-credentials').addEventListener('click', function() {    
    if (transactionId.value.length !== 64) {
        showNotification('Please input a valid transaction ID');
    } else {
        getCredentials(transactionId.value);
    }
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

function createVpnServerList() {
    fetch('/api/vpn-servers')
    .then(response => response.json())
    .then(servers => {
        const vpnList = document.getElementById('vpn-list');
        servers.forEach(server => {
            const div = document.createElement('div');
            div.className = 'server-item';
            div.dataset.url = server.url;
            div.dataset.pktaddress = server.pktaddress;
            div.dataset.cost = server.cost;
            div.innerHTML = `<div class="top-row"><img src="assets/images/flags/${server.country}.svg"><span>${server.name}</span></div><div id="pktaddress-${server.name}" class="pkt-address">${server.pktaddress}</div>`;
            div.addEventListener('click', function() {
                if(this.classList.contains('selected')) {
                    this.classList.remove('selected');
                    return;
                } else {
                    vpnList.querySelectorAll('.server-item').forEach(i => i.classList.remove('selected'));
                    this.classList.add('selected');
                    selectText("pktaddress-"+server.name);
                    showNotification('PKT address has been selected press Ctrl+C to copy it.');
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
    filesDiv.innerHTML = '';

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

function getCredentials(transactionId) {
    const selectedItem = document.querySelector('.server-item.selected');
    const serverName = selectedItem ? selectedItem.querySelector('span').textContent : '';
    fetch(`/api/get-credentials?transactionId=${transactionId}&serverName=${serverName}`)
        .then(response => response.json())
        .then(data => {
            let jsonData = JSON.parse(data);
            console.log(jsonData.status);
            if (jsonData.status === "success") {
                showFiles(jsonData.message);
            } else {
                document.getElementById('response').textContent = data;
            }
        });
}

window.onload = function() {
    createVpnServerList();
};