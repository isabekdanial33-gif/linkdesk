package app.linkdesk;
import android.content.Context;
import android.graphics.*;
import android.view.*;
/** Local, non-interactive overlay, owned by the explicitly enabled accessibility service. */
final class PointerOverlay extends View {
 private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);private float x=-100,y=-100;private Rect focus;private boolean down;
 PointerOverlay(Context c){super(c);setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);}
 void pointer(float px,float py,boolean pressed){x=px;y=py;down=pressed;invalidate();}
 void focus(Rect r){focus=r;invalidate();}
 protected void onDraw(Canvas c){super.onDraw(c);float d=getResources().getDisplayMetrics().density;paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(3*d);paint.setColor(Color.WHITE);c.drawCircle(x,y,(down?19:15)*d,paint);paint.setStrokeWidth(2*d);paint.setColor(Color.rgb(50,170,255));c.drawCircle(x,y,(down?16:12)*d,paint);paint.setStyle(Paint.Style.FILL);c.drawCircle(x,y,3*d,paint);if(focus!=null){paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(3*d);c.drawRoundRect(new RectF(focus),8*d,8*d,paint);}}
}
