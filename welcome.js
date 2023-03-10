class Tree{
    constructor(text, icon, nodes){
        this.text = text;
        this.icon = icon;
        this.nodes = nodes;
    }
}

/* 선택한 옵션 값을 받아오는 메소드 */
const option = () => {
    return $('#type').val();
};

/* 입력한 리포지토리 이름을 가져오는 메소드 */
const repositoryName = () => {
    return $('#name').val().trim();
};

/* 리포지토리 생성에 대한 응답 코드 */
const statusCode = (res, status, name) => {
    switch (status) {
        case 304:
            $('#success').hide();
            $('#error').text(`Error creating ${name} - Unable to modify repository. Try again later!`);
            $('#error').show();
            break;

        case 400:
            $('#success').hide();
            $('#error').text(`Error creating ${name} - Bad POST request, make sure you're not overriding any existing scripts`);
            $('#error').show();
            break;

        case 401:
            $('#success').hide();
            $('#error').text(`Error creating ${name} - Unauthorized access to repo. Try again later!`);
            $('#error').show();
            break;

        case 403:
            $('#success').hide();
            $('#error').text(`Error creating ${name} - Forbidden access to repository. Try again later!`);
            $('#error').show();
            break;

        case 422:
            $('#success').hide();
            $('#error').text(`Error creating ${name} - Unprocessable Entity. Repository may have already been created. Try Linking instead (select 2nd option).`);
            $('#error').show();
            break;

        default:
            /* Change mode type to commit */
            chrome.storage.local.set({ mode_type: 'commit' }, () => {
                $('#error').hide();
                $('#success').html(`Successfully created <a target="blank" href="${res.html_url}">${name}</a>. Start <a href="https://www.acmicpc.net/">BOJ</a>!`);
                $('#success').show();
                $('#unlink').show();
                /* Show new layout */
                document.getElementById('hook_mode').style.display = 'none';
                document.getElementById('commit_mode').style.display = 'inherit';
            });
            /* Set Repo Hook */
            chrome.storage.local.set({ BaekjoonHub_hook: res.full_name }, () => {
                console.log('Successfully set new repo hook');
            });

            break;
    }
};

/* 리포지토리 생성 메소드 */
const createRepo = (token, name) => {
    const AUTHENTICATION_URL = 'https://api.github.com/user/repos';
    let data = {
        name,
        private: true,
        auto_init: true,
        description: 'This is a auto push repository for Baekjoon Online Judge created with [NKLCBHub](https://github.com/Donghyeon0915/NKLCB_Hub).',
    };
    data = JSON.stringify(data);

    const xhr = new XMLHttpRequest();
    xhr.addEventListener('readystatechange', function () {
        if (xhr.readyState === 4) {
            statusCode(JSON.parse(xhr.responseText), xhr.status, name);
        }
    });

    stats = {};
    stats.version = chrome.runtime.getManifest().version;
    stats.submission = {};
    chrome.storage.local.set({ stats });

    xhr.open('POST', AUTHENTICATION_URL, true);
    xhr.setRequestHeader('Authorization', `token ${token}`);
    xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
    xhr.send(data);
};

/* 기존 리포지토리 연결에 대한 응답 코드 */
const linkStatusCode = (status, name) => {
    let bool = false;
    switch (status) {
        case 301:
            $('#success').hide();
            $('#error').html(`Error linking <a target="blank" href="${`https://github.com/${name}`}">${name}</a> to NKLCBHub. <br> This repository has been moved permenantly. Try creating a new one.`);
            $('#error').show();
            break;

        case 403:
            $('#success').hide();
            $('#error').html(`Error linking <a target="blank" href="${`https://github.com/${name}`}">${name}</a> to NKLCBHub. <br> Forbidden action. Please make sure you have the right access to this repository.`);
            $('#error').show();
            break;

        case 404:
            $('#success').hide();
            $('#error').html(`Error linking <a target="blank" href="${`https://github.com/${name}`}">${name}</a> to NKLCBHub. <br> Resource not found. Make sure you enter the right repository name.`);
            $('#error').show();
            break;

        default:
            bool = true;
            break;
    }
    $('#unlink').show();
    return bool;
};

/* 
    Method for linking hook with an existing repository 
    Steps:
    1. Check if existing repository exists and the user has write access to it.
    2. Link Hook to it (chrome Storage).
*/
/**
 * 리포지토리를 연결하는 메소드 (해당 메소드가 핵심)
 * Hook 모드 = 리포지토리 연동 모드
 * Commit 모드 = 리포지토리 연동이 완료 되고 파일 업로드만 남은 경우
 */
const linkRepo = (token, name) => {
    const AUTHENTICATION_URL = `https://api.github.com/repos/${name}`;

    const xhr = new XMLHttpRequest();
    xhr.addEventListener('readystatechange', function () {
        if (xhr.readyState === 4) {
            const res = JSON.parse(xhr.responseText);
            const bool = linkStatusCode(xhr.status, name);
            if (xhr.status === 200) {
                // BUG FIX
                if (!bool) { // 리포지토리 연동에 실패한 경우 (Hook 유지)
                    // unable to gain access to repo in commit mode. Must switch to hook mode.
                    /* Set mode type to hook */
                    chrome.storage.local.set({ mode_type: 'hook' }, () => {
                        console.log(`Error linking ${name} to NKLCBHub`);
                    });
                    /* Set Repo Hook to NONE */
                    chrome.storage.local.set({ BaekjoonHub_hook: null }, () => {
                        console.log('Defaulted repo hook to NONE');
                    });

                    /* Hide accordingly */
                    document.getElementById('hook_mode').style.display = 'inherit';
                    document.getElementById('commit_mode').style.display = 'none';
                } else {
                    // 리포지토리 연동에 성공한 경우 (Commit 모드로 변경)
                    /* Change mode type to commit */
                    /* Save repo url to chrome storage */
                    chrome.storage.local.set({ mode_type: 'commit', repo: res.html_url }, () => {
                        $('#error').hide();
                        $('#success').html(`Successfully linked <a target="blank" style="color:#4d4d4d" href="${res.html_url}">${name}</a> to NKLCBHub.<br>Start <a href="https://www.acmicpc.net/" style="color:#4d4d4d">BOJ</a> now!<br><br>`);
                        $('#success').show();
                        $('#unlink').show();
                    });

                    /* Set Repo Hook */
                    stats = {};
                    stats.version = chrome.runtime.getManifest().version;
                    stats.submission = {};
                    chrome.storage.local.set({ stats });

                    chrome.storage.local.set({ BaekjoonHub_hook: res.full_name }, () => {
                        console.log('Successfully set new repo hook');
                        /* Get problems solved count */
                        chrome.storage.local.get('stats', (psolved) => {
                            const { stats } = psolved;
                        });
                    });
                    saveRepositoryDirectory(res.full_name, token);
                    /* Hide accordingly */
                    document.getElementById('hook_mode').style.display = 'none';
                    document.getElementById('commit_mode').style.display = 'inherit';
                }
            }
        }
    });

    xhr.open('GET', AUTHENTICATION_URL, true);
    xhr.setRequestHeader('Authorization', `token ${token}`);
    xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
    xhr.send();
};

const unlinkRepo = () => {
    /* Set mode type to hook */
    chrome.storage.local.set({ mode_type: 'hook' }, () => {
        console.log(`Unlinking repo`);
    });
    /* Set Repo Hook to NONE */
    chrome.storage.local.set({ BaekjoonHub_hook: null }, () => {
        console.log('Defaulted repo hook to NONE');
    });

    chrome.storage.local.remove(["Git_Repository_Tree", "directoryMap"], function(){
        var error = chrome.runtime.lastError;
           if (error) { console.error(error); }
       })

    /* Hide accordingly */
    document.getElementById('hook_mode').style.display = 'inherit';
    document.getElementById('commit_mode').style.display = 'none';
};

/* Check for value of select tag, Get Started disabled by default */

$('#type').on('change', function () {
    const valueSelected = this.value;
    if (valueSelected) {
        $('#hook_button').attr('disabled', false);
    } else {
        $('#hook_button').attr('disabled', true);
    }
});

/* 
 * Get Started 버튼 클릭 이벤트
 * 선택한 옵션에 따라 동작 수행
 */
$('#hook_button').on('click', () => {
    /* on click should generate: 1) option 2) repository name */
    if (!option()) { // 옵션이 선택되지 않은 경우
        $('#error').text('No option selected - Pick an option from dropdown menu below that best suits you!');
        $('#error').show();
    } else if (!repositoryName()) { // 리포지터리 이름이 입력되지 않은 경우
        $('#error').text('No repository name added - Enter the name of your repository!');
        $('#name').focus();
        $('#error').show();
    } else { // 정상적인 경우
        $('#error').hide();
        $('#success').text('Attempting to create Hook... Please wait.');
        $('#success').show();

        /* 
          Perform processing
          - step 1: Check if current stage === hook.
          - step 2: store repo name as repoName in chrome storage.
          - step 3: if (1), POST request to repoName (iff option = create new repo) ; else display error message.
          - step 4: if proceed from 3, hide hook_mode and display commit_mode (show stats e.g: files pushed/questions-solved/leaderboard)
        */
        // BaekjoonHub_token이 존재하는지 먼저 확인
        chrome.storage.local.get('BaekjoonHub_token', (data) => {
            const token = data.BaekjoonHub_token;
            if (token === null || token === undefined) {
                // 토큰이 없으면 아직 인증되지 않은 경우
                /* Not authorized yet. */
                $('#error').text('Authorization error - Grant NKLCBHub access to your GitHub account to continue (launch extension to proceed)');
                $('#error').show();
                $('#success').hide();

            } else if (option() === 'new') { // Create a new private Repository(새로운 리포저토리 만들기)를 선택한 경우
                createRepo(token, repositoryName()); // 리포지토리 생성
            } else {
                // BaekjoonHub_username을 가져옴
                chrome.storage.local.get('BaekjoonHub_username', (data2) => {
                    const username = data2.BaekjoonHub_username;
                    if (!username) {
                        // username이 없으면 아직 인증되지 않은 경우
                        /* Improper authorization. */
                        $('#error').text('Improper Authorization error - Grant NKLCBHub access to your GitHub account to continue (launch extension to proceed)');
                        $('#error').show();
                        $('#success').hide();
                    } else {
                        /**
                         *  기존 리포지토리랑 연동하는 메소드
                         *  업로드하기전 리포지토리의 폴더 트리를 보여준 후
                         *  사용자가 선택한 리포지토리에 대해서 해당 메소드를 계속 사용해야할 듯
                         */
                        linkRepo(token, `${username}/${repositoryName()}`, false);
                    }
                });
            }
        });
    }
});

$('#unlink a').on('click', () => {
    unlinkRepo();
    $('#unlink').hide();
    $('#success').text('Successfully unlinked your current git repo. Please create/link a new hook.');
});

/* Detect mode type */
chrome.storage.local.get('mode_type', (data) => {
    const mode = data.mode_type;

    if (mode && mode === 'commit') {
        /* Check if still access to repo */
        chrome.storage.local.get('BaekjoonHub_token', (data2) => {
            const token = data2.BaekjoonHub_token;
            if (token === null || token === undefined) {
                /* Not authorized yet. */
                $('#error').text('Authorization error - Grant NKLCBHub access to your GitHub account to continue (click NKLCBHub extension on the top right to proceed)');
                $('#error').show();
                $('#success').hide();
                /* Hide accordingly */
                document.getElementById('hook_mode').style.display = 'inherit';
                document.getElementById('commit_mode').style.display = 'none';
            } else {
                /* Get access to repo */
                chrome.storage.local.get('BaekjoonHub_hook', (repoName) => {
                    const hook = repoName.BaekjoonHub_hook;
                    if (!hook) {
                        /* Not authorized yet. */
                        $('#error').text('Improper Authorization error - Grant NKLCBHub access to your GitHub account to continue (click NKLCBHub extension on the top right to proceed)');
                        $('#error').show();
                        $('#success').hide();
                        /* Hide accordingly */
                        document.getElementById('hook_mode').style.display = 'inherit';
                        document.getElementById('commit_mode').style.display = 'none';
                    } else {
                        /* Username exists, at least in storage. Confirm this */
                        linkRepo(token, hook);
                    }
                });
            }
        });

        document.getElementById('hook_mode').style.display = 'none';
        document.getElementById('commit_mode').style.display = 'inherit';
    } else {
        document.getElementById('hook_mode').style.display = 'inherit';
        document.getElementById('commit_mode').style.display = 'none';
    }
});


/* Directory 관련 함수 */
var directoryMap = new Map();
/**
 * 사용자가 선택한 Repository의 디렉토리 구조를 Map으로 변환 후
 * JSON으로 저장하는 함수
 */
async function saveRepositoryDirectory(hook, token) {
    if (isNull(token) || isNull(hook)) {
        console.error('token or hook is null', token, hook);
        return;
    }

    //const git = new GitHub(hook, token);
    // 전체 디렉토리 가져오기 (결과가 로컬 스토리지에 저장 됨)
    const treePromise = await getTree(hook, token); 
    directoryMap = new Map();
    
    // 저장된 디렉토리 가져오기
    const treedata = await getTreeInLocalStorage();
    treedata.forEach(element => {
        convertDirectoryToMap(directoryMap, element.path);
    });
    
    /**
     * map으로 변환한 디렉토리를 다시 JSON으로 변환
     * 해당 JSON을 Popup.js로 전송해서 폴더 선택 가능하도록 하면됨
     * (부트스트랩 treeview 이용)
     */
    const array = new Array();
    directoryMap.forEach((value, key) =>{
        let tree = new Tree(key, 'fa fa-inbox', new Array());
        convertDirectoryToTree(tree, value);
        array.push(tree);
    })
    
    console.log('Saved Directory JSON');
    console.log(array);
    // 로컬 스토리지에 Directory Json 저장
    saveObjectInLocalStorage({directoryMap: JSON.stringify(array)});
}

/*
* 디렉토리를 Map으로 변환하는 함수
*/
function convertDirectoryToMap(map, path) {
    if (path == 0) return;

    const dir = path.split('/')[0];
    const lestStr = path.substr(dir.length + 1);

    if (!map.has(dir)) { // 해당 디렉토리가 저장되어있지 않으면
        map.set(dir, new Map());
    }

    convertDirectoryToMap(map.get(dir), lestStr);
}

/**
 * 디렉토리 Map을 Tree Json으로 변환하는 함수
 */
function convertDirectoryToTree(tree, map){
    if (map.size == 0) return;

    map.forEach((value, key) => {
        let array = new Array();
        let icon = 'fa fa-inbox';
        // 마지막 폴더인 경우 nodes를 null로, icon은 archive로 표시
        // 더 이상 들어가지 못하도록
        if(value.size == 0) {
            array = null;
            icon = 'fa fa-archive';
        }
        const subdir = new Tree(key, icon, array);
        convertDirectoryToTree(subdir, value);
        tree.nodes.push(subdir);
    })
}

async function getTree(hook, token) {
    return fetch(`https://api.github.com/repos/${hook}/git/trees/HEAD?recursive=1`, {
      method: 'GET',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    })
      .then((res) => res.json())
      .then(async (data) => {
        const trees = new Array();
        data.tree.forEach((tree)=>{
          if(tree.type == 'tree'){
            trees.push(tree);
          }
        });
      
        await saveTreeInLocalStorage(trees);
        return trees;
      });
  }

  async function getTreeInLocalStorage(){
    return await getObjectFromLocalStorage('Git_Repository_Tree');
}

async function saveTreeInLocalStorage(tree){
    return await saveObjectInLocalStorage({Git_Repository_Tree: tree});
}

/**
 * @author https://gist.github.com/sumitpore/47439fcd86696a71bf083ede8bbd5466
 * Chrome의 Local StorageArea에서 개체 가져오기
 * @param {string} key
 */
async function getObjectFromLocalStorage(key) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get(key, function (value) {
                resolve(value[key]);
            });
        } catch (ex) {
            reject(ex);
        }
    });
}

/**
 * @author https://gist.github.com/sumitpore/47439fcd86696a71bf083ede8bbd5466
 * Chrome의 Local StorageArea에 개체 저장
 * @param {*} obj
 */
async function saveObjectInLocalStorage(obj) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.set(obj, function () {
                resolve();
            });
        } catch (ex) {
            reject(ex);
        }
    });
}


function isNull(value) {
    return value === null || value === undefined;
}

