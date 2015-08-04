(function(global){
  "use strict";

  global.app = global.app || {};

  //---------------------------
  // Graph Render  module
  //---------------------------
  global.app.common = (function(/*global*/) {

    var escapeHtml = function(s) {

      return s.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;" )
        .replace(/'/g, "&#39;" );

    };

    return {
      escapeHtml: escapeHtml
    };

  })(global);

  //---------------------------
  // Graph Render  module
  //---------------------------
  global.app.graphRenderer = (function(/*global*/) {

    /**
     *
     */
    var createData = function(arr) {

        var categories = [], // e.g. [ "A", "B" ]
            series = [{
              name: "得票率",
              data: []
            }];

        arr.forEach(function(obj) {
          // categories
          categories.push(obj.id);
          // series
          series[0].data.push(
            [ (Math.round(obj.min * 1000)/10), (Math.round(obj.max * 1000)/10) ]
          );
        });

        return {
          categories: categories,
          series: series
        };
    };

    /**
     *
     */
    var render = function(arr, reliability) {

      var commonModule = global.app.common,
          dataObj = createData(arr);

      $('#graph-container').highcharts({
        chart: {
            type: 'columnrange',
            inverted: true
        },
        title: {
            text: '予想 得票率の信頼区間'
        },
        subtitle: {
            text: '・各得票率は、' + commonModule.escapeHtml(reliability) + "% の確率で以下の信頼区間内に収まる。<br>"
                + '・信頼区間が重らない場合、その順位はほぼ覆らないと言える。'
        },
        xAxis: {
          categories: dataObj.categories
        },
        yAxis: {
          title: {
            text: '得票率 ( % )'
          }
        },
        tooltip: {
          valueSuffix: '%'
        },
        plotOptions: {
          columnrange: {
            dataLabels: {
              enabled: true,
              formatter: function () {
                return this.y + '%';
              }
            }
          }
        },
        legend: {
          enabled: false
        },
        series: dataObj.series
      });
    };

    return {
      render: render
    };

  })(global);


  //---------------------------
  // confidenceInterval module
  //---------------------------
  global.app.confidenceInterval = (function(/*global*/) {

    /**
     *
     */
    var calc = function(rel_val, total, num_vote) {

      var sample_rate, deviation, min, max;

      sample_rate = num_vote / total;
      deviation = rel_val * Math.sqrt( (sample_rate * (1 - sample_rate)) / total );
      min = Math.round((sample_rate - deviation) * 1000) / 1000;
      max = Math.round((sample_rate + deviation) * 1000) / 1000;

      return {
        sample_rate: Math.round(sample_rate * 1000) / 1000,
        min: min,
        max: max
      };
    };

    /**
     *
     */
    var calcAll = function(total, reliability) {

      var map_reliability = {
            95: 1.96,
            99: 2.58
          },
          rel_val = map_reliability[95], // default value
          resultArray = [];

      if (total === '' || isNaN(total)) {
        throw new Error('抽出人数には、数値をセットして下さい。');
      } else if (reliability === '' || isNaN(reliability)) {
        throw new Error('信頼度を選択して下さい。');
      }
      if (reliability in map_reliability) {
        rel_val = map_reliability[reliability];
      }
      rel_val = map_reliability[reliability];

      $('.candidate').each(function(/*index, elm*/){
        var num_vote = $(this).val(),
            obj;
        if (num_vote === '') return;
        if (isNaN(num_vote)) {
          throw new Error($(this).data('name') + 'に投票した人数には、数値をセットして下さい。');
        }

        obj = calc(rel_val, total, num_vote);

        resultArray.push({
          id: $(this).data('name'),
          min: obj.min,
          max: obj.max,
          sample_rate: obj.sample_rate,
          reliability: reliability
        });
      });
      if (resultArray.length === 0) {
        throw new Error('投票した人数を最低１つはセットして下さい。');
      }

      if (typeof console !== 'undefined') {
        console.info(resultArray);
     }

      return resultArray;
    };

    /**
     *
     */
    var createDescriptionHtml = function(sample_rate, reliability, min, max) {

      var html = '';

      html = '<ul>';
      html += '<li class="conclusion">最終的なAの得票率は、<strong>' + reliability + '%</strong>の確率で '
            + '<strong>' + (Math.round(min * 1000)/10) + '%</strong> から <strong>' + (Math.round(max * 1000)/10) + '%</strong> までの間に入る。</li>';
      //html += '<li>（その地域の全有権者が何人なのかは関係ない）</li>';
      html += '</ul>';

      return html;
    };

    return {
        calcAll: calcAll,
        createDescriptionHtml: createDescriptionHtml
    };

  })(global);

  //--------------
  // Form module
  //--------------
  global.app.form = (function(global) {

    var setHandlers = function() {

        var contIntModule = global.app.confidenceInterval,
            resArray;

        $('#btn-calc').on('click', function(event) {
            var  reliability;
            event.preventDefault();
            try {

              reliability = parseInt($('input:radio[name=reliability]:checked').val());

              $('#graph-container').html('');
              $('#error-area').html('').hide();
              resArray = contIntModule.calcAll($('#total').val(), reliability);
              global.app.graphRenderer.render(resArray, reliability);
            } catch (error) {
              console.error(error);
              $('#error-area').html(error.message).show();
            }
        });

        $('#btn-clear').on('click', function(/*event*/) {
            $('#total').val('');
            $('.candidate').each(function(/*index, elm*/){
              $(this).val('');
            });
            $('#graph-container').html('');
            $('#error-area').html('').hide();
        });

    };

    return {
        setHandlers: setHandlers
    };

  })(global);

  //------------
  // Main
  //------------
  $(function(){

    global.app.form.setHandlers();

  });

})((typeof window === 'object' && window) || global);
