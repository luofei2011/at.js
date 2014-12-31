<?php

//var_dump($_GET);
//var_dump($_POST);
$data = array("a" => "a", "b" => "b");
$data = json_encode($data);

echo $_GET['callback'] . "('" . $data . "');";
