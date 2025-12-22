% VOX文件数据结构分析器
% 帮助找到正确的数据起始位置和排列方式

clear;
clc;

%% 配置
vox_file = 'your_file.vox';  % 修改为您的文件路径
WIDTH = 1024;
HEIGHT = 1024;
EXPECTED_SLICES = 831;

%% 文件基本信息
file_info = dir(vox_file);
file_size = file_info.bytes;
expected_data_size = WIDTH * HEIGHT * EXPECTED_SLICES * 2;

fprintf('=== VOX文件分析 ===\n');
fprintf('文件名: %s\n', vox_file);
fprintf('文件大小: %d 字节 (%.2f MB)\n', file_size, file_size/1024/1024);
fprintf('期望数据大小: %d 字节 (%.2f MB)\n', expected_data_size, expected_data_size/1024/1024);
fprintf('大小差异: %d 字节\n', file_size - expected_data_size);

%% 分析可能的文件头
fid = fopen(vox_file, 'rb');
if fid == -1
    error('无法打开文件');
end

% 读取文件开头
header_bytes = fread(fid, 2048, 'uint8');
fclose(fid);

fprintf('\n=== 文件头分析 ===\n');
fprintf('前16字节 (十六进制): ');
for i = 1:min(16, length(header_bytes))
    fprintf('%02X ', header_bytes(i));
end
fprintf('\n');

% 尝试解释为文本
printable_chars = header_bytes(header_bytes >= 32 & header_bytes <= 126);
if length(printable_chars) > 10
    fprintf('可能的文本信息: %s\n', char(printable_chars(1:min(50, length(printable_chars)))'));
end

%% 尝试不同的偏移量和字节顺序
fprintf('\n=== 测试不同配置 ===\n');

test_offsets = [0, 256, 512, 768, 1024, 1280, 1536, 2048];
byte_orders = {'ieee-le', 'ieee-be'};  % little-endian, big-endian
data_types = {'uint16', 'int16'};

best_config = struct('offset', 0, 'byte_order', 'ieee-le', 'data_type', 'uint16', 'score', -1);

for offset = test_offsets
    for bo_idx = 1:length(byte_orders)
        for dt_idx = 1:length(data_types)
            byte_order = byte_orders{bo_idx};
            data_type = data_types{dt_idx};

            [score, stats] = evaluate_configuration(vox_file, offset, WIDTH, HEIGHT, byte_order, data_type);

            fprintf('偏移:%4d, 字节序:%s, 类型:%s, 评分:%.3f, 非零比例:%.3f, 方差:%.0f\n', ...
                offset, byte_order, data_type, score, stats.non_zero_ratio, stats.variance);

            if score > best_config.score
                best_config.offset = offset;
                best_config.byte_order = byte_order;
                best_config.data_type = data_type;
                best_config.score = score;
            end
        end
    end
end

fprintf('\n=== 最佳配置 ===\n');
fprintf('偏移量: %d 字节\n', best_config.offset);
fprintf('字节序: %s\n', best_config.byte_order);
fprintf('数据类型: %s\n', best_config.data_type);
fprintf('质量评分: %.3f\n', best_config.score);

%% 使用最佳配置生成示例图像
fprintf('\n=== 生成示例图像 ===\n');
sample_indices = [1, round(EXPECTED_SLICES/4), round(EXPECTED_SLICES/2), round(3*EXPECTED_SLICES/4), EXPECTED_SLICES];

fid = fopen(vox_file, 'rb');
fseek(fid, best_config.offset, 'bof');

figure('Name', 'VOX数据示例切片', 'Position', [100, 100, 1200, 800]);

for i = 1:length(sample_indices)
    slice_idx = sample_indices(i);

    % 定位到指定切片
    slice_offset = (slice_idx - 1) * WIDTH * HEIGHT * 2;
    fseek(fid, best_config.offset + slice_offset, 'bof');

    % 读取数据
    slice_data = fread(fid, [WIDTH, HEIGHT], best_config.data_type, best_config.byte_order);

    if size(slice_data, 1) == WIDTH && size(slice_data, 2) == HEIGHT
        subplot(2, 3, i);
        imagesc(slice_data);
        colormap gray;
        axis image;
        title(sprintf('切片 %d', slice_idx));

        % 显示统计信息
        fprintf('切片 %d: 最小值=%d, 最大值=%d, 平均值=%.1f, 非零像素=%d\n', ...
            slice_idx, min(slice_data(:)), max(slice_data(:)), mean(slice_data(:)), sum(slice_data(:) > 0));
    else
        fprintf('警告: 切片 %d 数据不完整\n', slice_idx);
    end
end

% 添加整体直方图
subplot(2, 3, 6);
all_sample_data = [];
fseek(fid, best_config.offset, 'bof');
for i = 1:min(10, EXPECTED_SLICES)  % 取前10个切片的数据
    slice_data = fread(fid, [WIDTH, HEIGHT], best_config.data_type, best_config.byte_order);
    if ~isempty(slice_data)
        all_sample_data = [all_sample_data; slice_data(:)];
    end
end
if ~isempty(all_sample_data)
    histogram(all_sample_data(all_sample_data > 0), 50);
    title('数据值分布 (前10切片)');
    xlabel('像素值');
    ylabel('频次');
end

fclose(fid);

%% 检测可能的数据排列问题
fprintf('\n=== 数据排列检查 ===\n');
check_data_alignment(vox_file, best_config, WIDTH, HEIGHT);

fprintf('\n分析完成！\n');
fprintf('建议使用配置: 偏移=%d, 字节序=%s, 数据类型=%s\n', ...
    best_config.offset, best_config.byte_order, best_config.data_type);

%% 辅助函数
function [score, stats] = evaluate_configuration(filename, offset, width, height, byte_order, data_type)
    fid = fopen(filename, 'rb');
    if fid == -1
        score = -1;
        stats = struct();
        return;
    end

    try
        fseek(fid, offset, 'bof');

        % 读取几个切片进行评估
        total_score = 0;
        valid_slices = 0;
        all_values = [];

        for i = 1:min(5, 831)  % 测试前5个切片
            data = fread(fid, [width, height], data_type, byte_order);

            if size(data, 1) ~= width || size(data, 2) ~= height
                break;
            end

            values = data(:);
            all_values = [all_values; values];

            % 计算质量指标
            non_zero_ratio = sum(values > 0) / length(values);
            data_range = double(max(values) - min(values));
            data_var = var(double(values));

            % 检查是否有合理的图像结构
            grad_x = sum(sum(abs(diff(double(data), 1, 1))));
            grad_y = sum(sum(abs(diff(double(data), 1, 2))));
            gradient_strength = (grad_x + grad_y) / (width * height);

            % 评分 (0-1)
            slice_score = min(non_zero_ratio * 2, 1) * 0.3 + ...
                         min(data_range / 10000, 1) * 0.2 + ...
                         min(data_var / 1000000, 1) * 0.2 + ...
                         min(gradient_strength / 1000, 1) * 0.3;

            total_score = total_score + slice_score;
            valid_slices = valid_slices + 1;
        end

        if valid_slices > 0
            score = total_score / valid_slices;
            stats.non_zero_ratio = sum(all_values > 0) / length(all_values);
            stats.variance = var(double(all_values));
            stats.range = double(max(all_values) - min(all_values));
        else
            score = -1;
            stats = struct();
        end

    catch
        score = -1;
        stats = struct();
    end

    fclose(fid);
end

function check_data_alignment(filename, config, width, height)
    fid = fopen(filename, 'rb');
    fseek(fid, config.offset, 'bof');

    % 检查相邻切片的相似性
    fprintf('检查切片间相似性...\n');

    prev_slice = [];
    for i = 1:min(10, 831)
        slice_data = fread(fid, [width, height], config.data_type, config.byte_order);

        if ~isempty(prev_slice) && ~isempty(slice_data)
            % 计算相关系数
            corr_coef = corrcoef(prev_slice(:), slice_data(:));
            if size(corr_coef, 1) > 1
                similarity = corr_coef(1, 2);
                fprintf('切片 %d 与 %d 相似度: %.3f\n', i-1, i, similarity);
            end
        end

        prev_slice = slice_data;
    end

    fclose(fid);
end
