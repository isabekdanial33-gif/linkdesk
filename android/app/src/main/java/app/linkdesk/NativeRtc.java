package app.linkdesk;

import android.content.*;
import android.media.*;
import android.media.projection.MediaProjection;
import android.os.Build;
import android.graphics.*;
import java.nio.*;
import java.util.*;
import java.io.ByteArrayOutputStream;
import org.json.*;
import org.webrtc.*;

/** Media never crosses the WebView bridge; only signalling and encrypted input do. */
public final class NativeRtc {
 private final EglBase egl=EglBase.create();
 private final PeerConnectionFactory factory;
 private final VideoSource source;
 private final SurfaceTextureHelper texture;
 private final ScreenCapturerAndroid capturer;
 private final VideoTrack video;
 private PeerConnection pc;
 private DataChannel control,audio;
 private final List<IceCandidate> pending=new ArrayList<>();
 private String room="";
 private volatile boolean closed=false,audioRunning=false,connected=false;
 private volatile long lastFrame=0;
 private AudioRecord recorder;
 private Thread audioThread;
 public NativeRtc(Context context,Intent grant,MediaProjection.Callback callback,int w,int h) {
  PeerConnectionFactory.initialize(PeerConnectionFactory.InitializationOptions.builder(context).createInitializationOptions());
  factory=PeerConnectionFactory.builder().setVideoEncoderFactory(new DefaultVideoEncoderFactory(egl.getEglBaseContext(),true,true)).setVideoDecoderFactory(new DefaultVideoDecoderFactory(egl.getEglBaseContext())).createPeerConnectionFactory();
  source=factory.createVideoSource(true);texture=SurfaceTextureHelper.create("LinkDeskVideo",egl.getEglBaseContext());
  capturer=new ScreenCapturerAndroid(grant,callback);capturer.initialize(texture,context,source.getCapturerObserver());capturer.startCapture(w,h,60);
  video=factory.createVideoTrack("screen",source);video.addSink(this::fallback);
 }
 private void emit(String type,Object value){if(!closed&&!room.isEmpty())MainActivity.rtcEvent(room,type,value);}
 public synchronized void start(String id){if(pc!=null)return;room=id;
  PeerConnection.RTCConfiguration config=new PeerConnection.RTCConfiguration(Collections.singletonList(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer()));
  config.sdpSemantics=PeerConnection.SdpSemantics.UNIFIED_PLAN;
  pc=factory.createPeerConnection(config,new PeerConnection.Observer(){
   public void onSignalingChange(PeerConnection.SignalingState s){}
   public void onIceConnectionChange(PeerConnection.IceConnectionState s){connected=s==PeerConnection.IceConnectionState.CONNECTED||s==PeerConnection.IceConnectionState.COMPLETED;emit("connection",s.toString());}
   public void onIceConnectionReceivingChange(boolean r){}
   public void onIceGatheringChange(PeerConnection.IceGatheringState s){}
   public void onIceCandidate(IceCandidate c){try{emit("signal",new JSONObject().put("candidate",new JSONObject().put("candidate",c.sdp).put("sdpMid",c.sdpMid).put("sdpMLineIndex",c.sdpMLineIndex)));}catch(Exception ignored){}}
   public void onIceCandidatesRemoved(IceCandidate[] c){}
   public void onAddStream(MediaStream s){} public void onRemoveStream(MediaStream s){}
   public void onDataChannel(DataChannel d){} public void onRenegotiationNeeded(){}
   public void onAddTrack(RtpReceiver r,MediaStream[] s){}
  });
  if(pc==null)throw new IllegalStateException("WebRTC unavailable");
  RtpSender sender=pc.addTrack(video,Collections.singletonList("screen"));
  RtpParameters params=sender.getParameters();for(RtpParameters.Encoding encoding:params.encodings){encoding.maxFramerate=60;encoding.maxBitrateBps=6000000;}sender.setParameters(params);
  control=pc.createDataChannel("linkdesk",new DataChannel.Init());
  control.registerObserver(new DataChannel.Observer(){public void onBufferedAmountChange(long previous){}public void onStateChange(){if(!closed)emit("channel",control.state().toString().toLowerCase(Locale.ROOT));}public void onMessage(DataChannel.Buffer b){if(closed||b.binary||b.data.remaining()>600000)return;byte[] bytes=new byte[b.data.remaining()];b.data.get(bytes);emit("message",new String(bytes,java.nio.charset.StandardCharsets.UTF_8));}});
  if(audioRunning){DataChannel.Init ai=new DataChannel.Init();ai.ordered=false;ai.maxRetransmits=0;audio=pc.createDataChannel("audio-pcm-48000",ai);}
  pc.createOffer(new SDP(){public void onCreateSuccess(SessionDescription d){pc.setLocalDescription(new SDP(){public void onSetSuccess(){try{emit("signal",new JSONObject().put("description",new JSONObject().put("type","offer").put("sdp",d.description)));}catch(Exception ignored){}}},d);}},new MediaConstraints());
 }
 public synchronized void signal(JSONObject v)throws JSONException{if(pc==null||closed)return;if(v.has("description")){JSONObject d=v.getJSONObject("description");pc.setRemoteDescription(new SDP(){public void onSetSuccess(){synchronized(NativeRtc.this){if(closed)return;for(IceCandidate c:pending)pc.addIceCandidate(c);pending.clear();}}},new SessionDescription(SessionDescription.Type.fromCanonicalForm(d.getString("type")),d.getString("sdp")));}else if(v.has("candidate")){JSONObject c=v.getJSONObject("candidate");IceCandidate ice=new IceCandidate(c.optString("sdpMid"),c.optInt("sdpMLineIndex"),c.getString("candidate"));if(pc.getRemoteDescription()==null)pending.add(ice);else pc.addIceCandidate(ice);}}
 public boolean send(String data){return !closed&&control!=null&&control.state()==DataChannel.State.OPEN&&control.bufferedAmount()<64000&&control.send(new DataChannel.Buffer(ByteBuffer.wrap(data.getBytes(java.nio.charset.StandardCharsets.UTF_8)),false));}
 private class SDP implements SdpObserver {public void onCreateSuccess(SessionDescription d){}public void onSetSuccess(){}public void onCreateFailure(String e){emit("error",e);}public void onSetFailure(String e){emit("error",e);}}
 public void startAudio(Context context){if(Build.VERSION.SDK_INT<29||context.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)!=android.content.pm.PackageManager.PERMISSION_GRANTED)return;
  try{AudioPlaybackCaptureConfiguration config=new AudioPlaybackCaptureConfiguration.Builder(capturer.getMediaProjection()).addMatchingUsage(AudioAttributes.USAGE_MEDIA).addMatchingUsage(AudioAttributes.USAGE_GAME).build();
   recorder=new AudioRecord.Builder().setAudioPlaybackCaptureConfig(config).setAudioFormat(new AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(48000).setChannelMask(AudioFormat.CHANNEL_IN_MONO).build()).setBufferSizeInBytes(Math.max(19200,AudioRecord.getMinBufferSize(48000,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT))).build();
   recorder.startRecording();audioRunning=true;audioThread=new Thread(()->{byte[] bytes=new byte[1920];while(audioRunning){int n=recorder.read(bytes,0,bytes.length);if(n<0)break;if(n>0&&audio!=null&&audio.state()==DataChannel.State.OPEN&&audio.bufferedAmount()<7680)audio.send(new DataChannel.Buffer(ByteBuffer.wrap(Arrays.copyOf(bytes,n)),true));}},"LinkDeskSystemAudio");audioThread.start();
  }catch(Exception e){if(recorder!=null){recorder.release();recorder=null;}}
 }
 private void fallback(VideoFrame frame){if(closed||connected||System.currentTimeMillis()-lastFrame<1200)return;lastFrame=System.currentTimeMillis();
  VideoFrame.Buffer scaled=null;VideoFrame.I420Buffer yuv=null;
  try{int w=Math.min(640,frame.getBuffer().getWidth())&~1,h=(int)((long)frame.getBuffer().getHeight()*w/frame.getBuffer().getWidth())&~1;scaled=frame.getBuffer().cropAndScale(0,0,frame.getBuffer().getWidth(),frame.getBuffer().getHeight(),w,h);yuv=scaled.toI420();byte[] nv=new byte[w*h*3/2];ByteBuffer y=yuv.getDataY(),u=yuv.getDataU(),v=yuv.getDataV();for(int row=0;row<h;row++)for(int col=0;col<w;col++)nv[row*w+col]=y.get(row*yuv.getStrideY()+col);for(int row=0;row<h/2;row++)for(int col=0;col<w/2;col++){int pos=w*h+row*w+col*2;nv[pos]=v.get(row*yuv.getStrideV()+col);nv[pos+1]=u.get(row*yuv.getStrideU()+col);}ByteArrayOutputStream out=new ByteArrayOutputStream();new YuvImage(nv,ImageFormat.NV21,w,h,null).compressToJpeg(new Rect(0,0,w,h),50,out);CaptureService.latest="data:image/jpeg;base64,"+android.util.Base64.encodeToString(out.toByteArray(),android.util.Base64.NO_WRAP);
  }catch(Exception ignored){}finally{if(yuv!=null)yuv.release();if(scaled!=null)scaled.release();}
 }
 public void resize(int w,int h){if(!closed)capturer.changeCaptureFormat(w,h,60);}
 public void close(){closed=true;audioRunning=false;if(recorder!=null){try{recorder.stop();if(audioThread!=null)audioThread.join(1000);}catch(Exception ignored){}recorder.release();}if(control!=null)control.dispose();if(audio!=null)audio.dispose();if(pc!=null)pc.dispose();try{capturer.stopCapture();}catch(Exception ignored){}capturer.dispose();video.dispose();source.dispose();texture.dispose();factory.dispose();egl.release();}
}
