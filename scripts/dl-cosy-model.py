from modelscope import snapshot_download
p = snapshot_download('iic/CosyVoice2-0.5B',
                      local_dir='/home/acoop/CosyVoice/pretrained_models/CosyVoice2-0.5B')
print('MODEL_OK', p)
