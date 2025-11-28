$(document).ready(function () {
  $(".tab-btn").click(function () {
    $(".tab-btn").removeClass("active");
    $(".tab-content").removeClass("active");

    $(this).addClass("active");
    const tabId = $(this).data("tab");
    $("#" + tabId).addClass("active");
  });
  $(".tab-btn").first().click();

  $("#custom-font-color > h4 > span").on("click", function () {
    const CFC = $("#custom-font-color");
    const lists = CFC.find(".font-color-lists");
    const toggleButton = $(this);
    lists.slideUp();

    if (CFC.hasClass("hide")) {
      lists.stop().slideDown(200);
      CFC.removeClass("hide").addClass("opened");
      toggleButton.text("닫기");
    } else {
      lists.stop().slideUp(200);
      CFC.removeClass("opened").addClass("hide");
      toggleButton.text("열기");
    }
  });
});
