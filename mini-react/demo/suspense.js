function wrapPromise(promise) {
    let status = 'pending';
    let rst;

    const suspender = promise.then(
        (r) => {
            status = 'success'
            rst = r
        },
        (e) => {
            status = 'error'
            rst = e
        })

    return {
        read() {
            if (status === 'pending') {
                throw suspender
            } else if (status === 'success') {
                return rst
            } else if (status === 'error') {
                throw rst
            }
        }
    }
}


const getInfo = () => {
    const usersPromise = fetchUser()
    const postsPromise = fetchPosts()

    return {
        users: wrapPromise(usersPromise),
        posts: wrapPromise(postsPromise)
    }
}




function fetchUser() {
    console.log("fetch user...");
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("fetched user");
            resolve({
                name: "Ringo Starr"
            });
        }, 1000);
    });
}

function fetchPosts() {
    console.log("fetch posts...");
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("fetched posts");
            resolve([
                {
                    id: 0,
                    text: "I get by with a little help from my friends"
                },
                {
                    id: 1,
                    text: "I'd like to be under the sea in an octupus's garden"
                },
                {
                    id: 2,
                    text: "You got that sand all over your feet"
                }
            ]);
        }, 1100);
    });
}

// 需要在 react 组件中使用 suspense 捕获功能
/* const resource = getInfo()

console.log(resource.users.read()) */