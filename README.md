#### 介绍
类似新浪微博和QQ空间的@某人的功能

#### 用法

    <!--加入html容器-->
    <div id="at_sug_container"></div>
    <script src="/path/to/at.js"></script>
    <script>
        new At({
            node: document.getElementsByTagName('textarea')[0],
            data: ['abc', 'abd', 'a', 'b']
        });
    </script>

#### Version

2014-01-15 v1.0 已用于实际应用中
2014-12-30 v0.1 基本实现功能
