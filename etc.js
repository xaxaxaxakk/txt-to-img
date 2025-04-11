$(document).ready(function () {
  $(".tab-btn").click(function () {
    $(".tab-btn").removeClass("active");
    $(".tab-content").removeClass("active");

    $(this).addClass("active");
    const tabId = $(this).data("tab");
    $("#" + tabId).addClass("active");
  });
  $(".tab-btn").first().click();
});
